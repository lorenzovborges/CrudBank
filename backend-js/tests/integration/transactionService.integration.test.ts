import { ObjectId, type ClientSession } from 'mongodb';
import Decimal from 'decimal.js';
import { getMongoClient, getMongoDb } from '../../src/config/mongo';
import { DomainError } from '../../src/shared/errors/DomainError';
import { decodeGlobalId, encodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { sha256Hex } from '../../src/shared/utils/hash';
import type { TransactionService, TransferFundsPayload } from '../../src/modules/transaction/transactionService';
import { clearDatabase, startIntegrationApp, stopIntegrationApp, type IntegrationAppContext } from './testApp';
import { createAccount } from './helpers/graphqlHelpers';

type TransactionServicePrivateApi = TransactionService & {
  debitAccount: (
    fromAccountId: string,
    amount: Decimal,
    now: Date,
    session: ClientSession,
  ) => Promise<{ currentBalance: unknown }>;
  creditAccount: (
    toAccountId: string,
    amount: Decimal,
    now: Date,
    session: ClientSession,
  ) => Promise<{ currentBalance: unknown }>;
  buildReplayFromRecord: (record: Record<string, unknown>, requestHash: string) => TransferFundsPayload;
  serializePayload: (payload: TransferFundsPayload) => string;
  normalizeDescription: (description: string | null | undefined) => string;
  normalizeIdempotencyKey: (idempotencyKey: string) => string;
  findIdempotencyRecord: (sourceAccountId: string, key: string) => Promise<Record<string, unknown>>;
};

let context: IntegrationAppContext;

beforeAll(async () => {
  context = await startIntegrationApp();
});

afterAll(async () => {
  await stopIntegrationApp(context);
});

beforeEach(async () => {
  await clearDatabase();
});

function requestHash(fromAccountGlobalId: string, toAccountGlobalId: string, amount: string, description: string): string {
  return sha256Hex(
    `${decodeGlobalId(fromAccountGlobalId).id}|${decodeGlobalId(toAccountGlobalId).id}|${new Decimal(amount).toFixed(2)}|${description}`,
  );
}

describe('TransactionService integration', () => {
  it('validates transfer input fields and scalar precision semantics', async () => {
    const accountA = await createAccount(context.requester, 'Name A', '52998224725', '0001', '51001-1', '100.00');
    const accountB = await createAccount(context.requester, 'Name B', '02306078106', '0001', '51001-2', '100.00');

    const service = context.app.services.transactionService;

    await expect(service.transferFunds('', accountB, '1.00', 'x', 'k1')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, '', '1.00', 'x', 'k2')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, accountA, '1.00', 'x', 'k3')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, accountB, '1.001', 'x', 'k4')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, accountB, '1.00', 'x'.repeat(141), 'k5')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, accountB, '1.00', 'x', '')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.transferFunds(accountA, accountB, '1.00', 'x', 'k'.repeat(129))).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });
  });

  it('supports idempotent replay and rejects conflicting payloads', async () => {
    const accountA = await createAccount(context.requester, 'Idem A', '39053344705', '0001', '52001-1', '500.00');
    const accountB = await createAccount(context.requester, 'Idem B', '02306078106', '0001', '52001-2', '500.00');

    const service = context.app.services.transactionService;

    const first = await service.transferFunds(accountA, accountB, '10.00', 'idem', 'idem-key-1');
    const replay = await service.transferFunds(accountA, accountB, '10.00', 'idem', 'idem-key-1');

    expect(first.idempotentReplay).toBe(false);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.transaction.id).toBe(first.transaction.id);

    await expect(
      service.transferFunds(accountA, accountB, '20.00', 'idem', 'idem-key-1'),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'CONFLICT' });
  });

  it('handles pending/invalid idempotency payload records', async () => {
    const accountA = await createAccount(context.requester, 'Pending A', '52998224725', '0001', '53001-1', '500.00');
    const accountB = await createAccount(context.requester, 'Pending B', '02306078106', '0001', '53001-2', '500.00');

    const sourceAccountId = decodeGlobalId(accountA).id;
    const service = context.app.services.transactionService;
    const db = getMongoDb();

    const pendingKey = 'idem-pending-key';
    await db.collection('idempotency_records').insertOne({
      sourceAccountId,
      key: pendingKey,
      requestHash: requestHash(accountA, accountB, '1.00', 'pending'),
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.transferFunds(accountA, accountB, '1.00', 'pending', pendingKey)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'CONFLICT',
    });

    const invalidPayloadKey = 'idem-invalid-payload';
    await db.collection('idempotency_records').insertOne({
      sourceAccountId,
      key: invalidPayloadKey,
      requestHash: requestHash(accountA, accountB, '2.00', 'payload'),
      status: 'COMPLETED',
      responsePayload: '{invalid-json',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.transferFunds(accountA, accountB, '2.00', 'payload', invalidPayloadKey),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'BAD_REQUEST' });
  });

  it('validates transaction queries, recent list and inactive/insufficient transfer errors', async () => {
    const accountA = await createAccount(context.requester, 'Query A', '11144477735', '0001', '54001-1', '30.00');
    const accountB = await createAccount(context.requester, 'Query B', '39053344705', '0001', '54001-2', '30.00');

    const service = context.app.services.transactionService;

    await expect(service.getTransactionByGlobalId(accountA)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(
      service.getTransactionByGlobalId(encodeGlobalId('Transaction', new ObjectId().toHexString())),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'NOT_FOUND' });

    await expect(service.listTransactionsByAccount(accountA, 'SENT', 0, null)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    const invalidCursor = Buffer.from(`${Date.now()}:not-object-id`, 'utf8').toString('base64url');
    await expect(
      service.listTransactionsByAccount(accountA, 'SENT', 10, invalidCursor),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'NOT_FOUND' });

    await expect(service.listRecentTransactions([accountA], 0)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.listRecentTransactions([''], 10)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(service.listRecentTransactions([], 10)).resolves.toEqual([]);

    await expect(service.transferFunds(accountA, accountB, '31.00', 'too-much', 'k-insufficient')).rejects.toMatchObject<
      Partial<DomainError>
    >({ code: 'INSUFFICIENT_FUNDS' });

    await context.app.services.accountService.deactivateAccount(accountA);
    await expect(service.transferFunds(accountA, accountB, '1.00', 'inactive-src', 'k-inactive-src')).rejects.toMatchObject<
      Partial<DomainError>
    >({ code: 'ACCOUNT_INACTIVE' });

    const accountC = await createAccount(context.requester, 'Query C', '02306078106', '0002', '54001-3', '10.00');
    await context.app.services.accountService.deactivateAccount(accountC);

    const accountD = await createAccount(context.requester, 'Query D', '52998224725', '0002', '54001-4', '10.00');
    await expect(service.transferFunds(accountD, accountC, '1.00', 'inactive-dst', 'k-inactive-dst')).rejects.toMatchObject<
      Partial<DomainError>
    >({ code: 'ACCOUNT_INACTIVE' });
  });

  it('covers private transactional branches used by retry and replay paths', async () => {
    const accountA = await createAccount(context.requester, 'Private A', '52998224725', '0001', '55001-1', '5.00');
    const accountB = await createAccount(context.requester, 'Private B', '02306078106', '0001', '55001-2', '5.00');

    const service = context.app.services.transactionService as unknown as TransactionServicePrivateApi;
    const sourceId = decodeGlobalId(accountA).id;
    const destinationId = decodeGlobalId(accountB).id;

    const session = getMongoClient().startSession();
    try {
      await expect(
        service.debitAccount(sourceId, new Decimal('50.00'), new Date(), session),
      ).rejects.toMatchObject<Partial<DomainError>>({ code: 'INSUFFICIENT_FUNDS' });

      await context.app.services.accountService.deactivateAccount(accountB);
      await expect(
        service.creditAccount(destinationId, new Decimal('1.00'), new Date(), session),
      ).rejects.toMatchObject<Partial<DomainError>>({ code: 'ACCOUNT_INACTIVE' });

      await expect(
        service.creditAccount(new ObjectId().toHexString(), new Decimal('1.00'), new Date(), session),
      ).rejects.toMatchObject<Partial<DomainError>>({ code: 'NOT_FOUND' });
    } finally {
      await session.endSession();
    }

    expect(service.normalizeDescription(null)).toBe('');
    expect(() => service.normalizeDescription('x'.repeat(141))).toThrow('Description must have at most 140 characters');

    expect(() => service.normalizeIdempotencyKey('')).toThrow('Idempotency key is required');
    expect(() => service.normalizeIdempotencyKey('x'.repeat(129))).toThrow('Idempotency key must have at most 128 characters');

    await expect(service.findIdempotencyRecord(sourceId, 'missing-key')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'CONFLICT',
    });

    const payload: TransferFundsPayload = {
      transaction: {
        __typename: 'Transaction',
        id: encodeGlobalId('Transaction', new ObjectId().toHexString()),
        fromAccountId: encodeGlobalId('Account', sourceId),
        toAccountId: encodeGlobalId('Account', destinationId),
        amount: '1.00',
        currency: 'BRL',
        description: 'ok',
        idempotencyKey: 'k',
        createdAt: new Date().toISOString(),
      },
      fromAccountBalance: '4.00',
      toAccountBalance: '6.00',
      idempotentReplay: false,
      processedAt: new Date().toISOString(),
    };

    const record = {
      _id: new ObjectId(),
      sourceAccountId: sourceId,
      key: 'k',
      requestHash: 'hash-1',
      responsePayload: JSON.stringify(payload),
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    };

    const replay = service.buildReplayFromRecord(record, 'hash-1');
    expect(replay.idempotentReplay).toBe(true);

    expect(() => service.buildReplayFromRecord(record, 'different-hash')).toThrow('different payload');
    expect(() =>
      service.buildReplayFromRecord({ ...record, responsePayload: '' }, 'hash-1'),
    ).toThrow('currently being processed');
    expect(() =>
      service.buildReplayFromRecord({ ...record, responsePayload: '{invalid' }, 'hash-1'),
    ).toThrow('Idempotency replay payload is invalid');

    const stringifySpy = jest.spyOn(JSON, 'stringify').mockImplementation(() => {
      throw new Error('serialize failed');
    });
    expect(() => service.serializePayload(payload)).toThrow('Unable to persist idempotency payload');
    stringifySpy.mockRestore();
  });
});
