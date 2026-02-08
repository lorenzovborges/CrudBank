import { ObjectId, type Db, type ClientSession } from 'mongodb';
import * as mongoModule from '../../src/config/mongo';
import { encodeCursor } from '../../src/shared/relay/cursorCodec';
import { encodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { TransactionService, type TransferFundsPayload } from '../../src/modules/transaction/transactionService';

type TransactionCollectionMock = {
  insertOne: jest.Mock<Promise<{ insertedId: ObjectId }>, [Record<string, unknown>, Record<string, unknown>?]>;
  findOne: jest.Mock<Promise<Record<string, unknown> | null>, [Record<string, unknown>, Record<string, unknown>?]>;
  find: jest.Mock;
};

type IdempotencyCollectionMock = {
  findOne: jest.Mock<Promise<Record<string, unknown> | null>, [Record<string, unknown>]>;
  insertOne: jest.Mock<Promise<{ insertedId: ObjectId }>, [Record<string, unknown>]>;
  deleteOne: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
  updateOne: jest.Mock<Promise<unknown>, [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>?]>;
};

type AccountsCollectionMock = {
  findOneAndUpdate: jest.Mock<Promise<Record<string, unknown> | null>, [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>?]>;
};

type ServicePrivateApi = TransactionService & {
  replayOrWait: (
    record: Record<string, unknown>,
    sourceAccountId: string,
    idempotencyKey: string,
    requestHash: string,
  ) => Promise<TransferFundsPayload>;
  executeTransfer: (
    fromAccountId: string,
    toAccountId: string,
    amount: unknown,
    description: string,
    idempotencyKey: string,
    idempotencyRecordId: ObjectId,
    session: ClientSession,
  ) => Promise<TransferFundsPayload>;
  creditAccount: (
    toAccountId: string,
    amount: unknown,
    now: Date,
    session: ClientSession,
  ) => Promise<Record<string, unknown>>;
};

function chainFindResult(result: Record<string, unknown>[]) {
  return {
    sort: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

describe('TransactionService edge branches', () => {
  function buildService(options: {
    transactionCollection?: Partial<TransactionCollectionMock>;
    idempotencyCollection?: Partial<IdempotencyCollectionMock>;
    accountsCollection?: Partial<AccountsCollectionMock>;
    accountService?: Partial<{
      findRawByGlobalId: (...args: unknown[]) => Promise<Record<string, unknown>>;
      decodeAccountId: (...args: unknown[]) => Promise<string>;
      findById: (...args: unknown[]) => Promise<Record<string, unknown>>;
    }>;
  } = {}) {
    const transactionCollection: TransactionCollectionMock = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      findOne: jest.fn().mockResolvedValue({
        _id: new ObjectId(),
        fromAccountId: new ObjectId().toHexString(),
        toAccountId: new ObjectId().toHexString(),
        amount: '1.00',
        currency: 'BRL',
        description: 'x',
        idempotencyKey: 'k',
        createdAt: new Date(),
      }),
      find: jest.fn().mockReturnValue(chainFindResult([])),
      ...options.transactionCollection,
    };

    const idempotencyCollection: IdempotencyCollectionMock = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      deleteOne: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({}),
      ...options.idempotencyCollection,
    };

    const accountsCollection: AccountsCollectionMock = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ currentBalance: '1.00', status: 'ACTIVE' }),
      ...options.accountsCollection,
    };

    const db = {
      collection: jest.fn((name: string) => {
        if (name === 'transactions') {
          return transactionCollection;
        }
        if (name === 'idempotency_records') {
          return idempotencyCollection;
        }
        if (name === 'accounts') {
          return accountsCollection;
        }
        return transactionCollection;
      }),
    } as unknown as Db;

    const fromId = new ObjectId().toHexString();
    const toId = new ObjectId().toHexString();

    const accountService = {
      findRawByGlobalId: jest.fn(async (globalId: string) => ({
        _id: new ObjectId(globalId.includes('to') ? toId : fromId),
      })),
      decodeAccountId: jest.fn().mockResolvedValue(fromId),
      findById: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      ...options.accountService,
    };

    const leakyBucketService = {
      assertAllowed: jest.fn().mockResolvedValue(undefined),
    };

    const service = new TransactionService(
      db,
      accountService as never,
      leakyBucketService as never,
      { idempotencyTtlHours: 24 },
    ) as ServicePrivateApi;

    return {
      service,
      accountService,
      leakyBucketService,
      transactionCollection,
      idempotencyCollection,
      accountsCollection,
      fromGlobalId: `from-${fromId}`,
      toGlobalId: `to-${toId}`,
    };
  }

  it('rethrows non-duplicate insert errors in idempotency reserve stage', async () => {
    const setup = buildService({
      idempotencyCollection: {
        insertOne: jest.fn().mockRejectedValue(new Error('reserve failed')),
      },
    });

    await expect(
      setup.service.transferFunds(setup.fromGlobalId, setup.toGlobalId, '1.00', 'x', 'k1'),
    ).rejects.toThrow('reserve failed');
  });

  it('handles data-integrity retry path after transactional failure', async () => {
    const setup = buildService();
    const payload = {
      transaction: {
        __typename: 'Transaction',
        id: encodeGlobalId('Transaction', new ObjectId().toHexString()),
        fromAccountId: encodeGlobalId('Account', new ObjectId().toHexString()),
        toAccountId: encodeGlobalId('Account', new ObjectId().toHexString()),
        amount: '1.00',
        currency: 'BRL',
        description: 'x',
        idempotencyKey: 'k2',
        createdAt: new Date().toISOString(),
      },
      fromAccountBalance: '1.00',
      toAccountBalance: '2.00',
      idempotentReplay: false,
      processedAt: new Date().toISOString(),
    };

    let capturedHash = '';
    let lookupCount = 0;
    setup.idempotencyCollection.insertOne.mockImplementation(async (doc) => {
      capturedHash = String(doc.requestHash);
      return { insertedId: new ObjectId() };
    });

    setup.idempotencyCollection.findOne.mockImplementation(async (query) => {
      if ('_id' in query) {
        return {
          _id: query._id,
          requestHash: capturedHash,
          status: 'PENDING',
        };
      }

      lookupCount += 1;
      if (lookupCount > 1) {
        return {
          _id: new ObjectId(),
          sourceAccountId: query.sourceAccountId,
          key: query.key,
          requestHash: capturedHash,
          status: 'COMPLETED',
          responsePayload: JSON.stringify(payload),
        };
      }
      return null;
    });

    const withSessionSpy = jest.spyOn(mongoModule, 'withMongoSession').mockRejectedValueOnce({ code: 11000 });

    try {
      const result = await setup.service.transferFunds(setup.fromGlobalId, setup.toGlobalId, '1.00', 'x', 'k2');
      expect(result.idempotentReplay).toBe(true);
    } finally {
      withSessionSpy.mockRestore();
    }
  });

  it('returns transaction by global id and applies cursor filter for account list', async () => {
    const setup = buildService({
      accountService: {
        decodeAccountId: jest.fn().mockResolvedValue(new ObjectId().toHexString()),
      },
    });

    const txGlobalId = encodeGlobalId('Transaction', new ObjectId().toHexString());
    await expect(setup.service.getTransactionByGlobalId(txGlobalId)).resolves.toMatchObject({
      __typename: 'Transaction',
    });

    const cursor = encodeCursor(new Date(), new ObjectId().toHexString());
    await setup.service.listTransactionsByAccount('account-1', 'SENT', 10, cursor);

    const filter = setup.transactionCollection.find.mock.calls[0][0] as Record<string, unknown>;
    expect(filter.$or).toBeDefined();
  });

  it('throws when transaction is not persisted after insert', async () => {
    const setup = buildService({
      transactionCollection: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    });

    jest.spyOn(setup.service as ServicePrivateApi, 'debitAccount').mockResolvedValue({ currentBalance: '9.00' });
    jest.spyOn(setup.service as ServicePrivateApi, 'creditAccount').mockResolvedValue({ currentBalance: '11.00' });

    await expect(
      setup.service.executeTransfer(
        new ObjectId().toHexString(),
        new ObjectId().toHexString(),
        1,
        'x',
        'k',
        new ObjectId(),
        {} as ClientSession,
      ),
    ).rejects.toThrow('Unable to process transfer');
  });

  it('throws destination not found when credit update misses active account', async () => {
    const setup = buildService({
      accountsCollection: {
        findOneAndUpdate: jest.fn().mockResolvedValue(null),
      },
      accountService: {
        findById: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      },
    });

    await expect(
      setup.service.creditAccount(new ObjectId().toHexString(), 1, new Date(), {} as ClientSession),
    ).rejects.toThrow('Destination account not found');
  });

  it('handles replay polling edge cases', async () => {
    const setup = buildService();
    const sourceAccountId = new ObjectId().toHexString();

    const pendingRecord = {
      _id: new ObjectId(),
      sourceAccountId,
      key: 'k-edge',
      requestHash: 'hash-edge',
      status: 'PENDING',
      responsePayload: undefined,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setup.idempotencyCollection.findOne.mockResolvedValueOnce(null);
    await expect(
      setup.service.replayOrWait(pendingRecord, sourceAccountId, 'k-edge', 'hash-edge'),
    ).rejects.toThrow('Idempotency conflict');

    const completedWithoutPayload = {
      ...pendingRecord,
      status: 'COMPLETED',
      responsePayload: '',
    };

    await expect(
      setup.service.replayOrWait(completedWithoutPayload, sourceAccountId, 'k-edge', 'hash-edge'),
    ).rejects.toThrow('currently being processed');

    const validPayload = {
      transaction: {
        __typename: 'Transaction',
        id: encodeGlobalId('Transaction', new ObjectId().toHexString()),
        fromAccountId: encodeGlobalId('Account', sourceAccountId),
        toAccountId: encodeGlobalId('Account', new ObjectId().toHexString()),
        amount: '1.00',
        currency: 'BRL',
        description: 'ok',
        idempotencyKey: 'k-edge',
        createdAt: new Date().toISOString(),
      },
      fromAccountBalance: '1.00',
      toAccountBalance: '2.00',
      idempotentReplay: false,
      processedAt: new Date().toISOString(),
    };

    setup.idempotencyCollection.findOne.mockResolvedValueOnce({
      ...pendingRecord,
      status: 'COMPLETED',
      responsePayload: JSON.stringify(validPayload),
    });

    const replayed = await setup.service.replayOrWait(pendingRecord, sourceAccountId, 'k-edge', 'hash-edge');
    expect(replayed.idempotentReplay).toBe(true);
  });
});
