import Decimal from 'decimal.js';
import {
  ObjectId,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type MongoServerError,
  type ClientSession,
  type WithId,
} from 'mongodb';
import { DomainError } from '../../shared/errors/DomainError';
import { decodeCursor, encodeCursor } from '../../shared/relay/cursorCodec';
import { decodeGlobalId, encodeGlobalId } from '../../shared/relay/globalIdCodec';
import { sha256Hex } from '../../shared/utils/hash';
import { decimalToDecimal128, decimalToString } from '../../shared/utils/decimal';
import { validatePositiveAmount } from '../../shared/validators/moneyValidator';
import {
  AccountService,
  type ConnectionView,
  type AccountStatus,
} from '../account/accountService';
import { LeakyBucketService } from '../ratelimit/leakyBucketService';
import { withMongoSession } from '../../config/mongo';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_RECENT_PAGE_SIZE = 10;
const IDEMPOTENCY_POLL_ATTEMPTS = 8;
const IDEMPOTENCY_POLL_SLEEP_MS = 25;

export type TransactionDirection = 'SENT' | 'RECEIVED';
export type RecentTransactionType = 'SENT' | 'RECEIVED' | 'TRANSFER';

type CurrencyCode = 'BRL';

type IdempotencyRecordStatus = 'PENDING' | 'COMPLETED';

interface TransactionDocument extends Document {
  _id?: ObjectId;
  fromAccountId: string;
  toAccountId: string;
  amount: unknown;
  currency: CurrencyCode;
  description: string;
  idempotencyKey: string;
  createdAt: Date;
}

interface IdempotencyRecordDocument extends Document {
  _id?: ObjectId;
  sourceAccountId: string;
  key: string;
  requestHash: string;
  responsePayload?: string;
  status?: IdempotencyRecordStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferFundsPayload {
  transaction: TransactionView;
  fromAccountBalance: string;
  toAccountBalance: string;
  idempotentReplay: boolean;
  processedAt: string;
}

export interface TransactionView {
  __typename: 'Transaction';
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
  description: string;
  idempotencyKey: string;
  createdAt: string | null;
}

export interface RecentTransactionView {
  transaction: TransactionView;
  type: RecentTransactionType;
}

interface TransactionServiceOptions {
  idempotencyTtlHours: number;
}

function transactionsCollection(db: Db): Collection<TransactionDocument> {
  return db.collection<TransactionDocument>('transactions');
}

function idempotencyCollection(db: Db): Collection<IdempotencyRecordDocument> {
  return db.collection<IdempotencyRecordDocument>('idempotency_records');
}

function toObjectId(id: string, message = 'Transaction not found'): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw DomainError.notFound(message);
  }
  return new ObjectId(id);
}

function ensureStatusActive(status: AccountStatus, destination = false): never {
  if (destination) {
    throw DomainError.accountInactive('Destination account is inactive');
  }
  throw DomainError.accountInactive('Source account is inactive');
}

export class TransactionService {
  private readonly db: Db;
  private readonly accountService: AccountService;
  private readonly leakyBucketService: LeakyBucketService;
  private readonly options: TransactionServiceOptions;

  constructor(
    db: Db,
    accountService: AccountService,
    leakyBucketService: LeakyBucketService,
    options: TransactionServiceOptions,
  ) {
    this.db = db;
    this.accountService = accountService;
    this.leakyBucketService = leakyBucketService;
    this.options = options;
  }

  async transferFunds(
    fromAccountGlobalId: string,
    toAccountGlobalId: string,
    amount: unknown,
    description: string | null | undefined,
    idempotencyKey: string,
  ): Promise<TransferFundsPayload> {
    if (!fromAccountGlobalId || fromAccountGlobalId.trim().length === 0) {
      throw DomainError.validationField('fromAccountId', 'Source account is required');
    }

    if (!toAccountGlobalId || toAccountGlobalId.trim().length === 0) {
      throw DomainError.validationField('toAccountId', 'Destination account is required');
    }

    const normalizedIdempotencyKey = this.normalizeIdempotencyKey(idempotencyKey);
    const normalizedDescription = this.normalizeDescription(description);
    const normalizedAmount = validatePositiveAmount(amount, 'amount');

    const fromAccount = await this.accountService.findRawByGlobalId(fromAccountGlobalId);
    const toAccount = await this.accountService.findRawByGlobalId(toAccountGlobalId);

    const fromAccountId = fromAccount._id.toHexString();
    const toAccountId = toAccount._id.toHexString();

    if (fromAccountId === toAccountId) {
      throw DomainError.validationField('toAccountId', 'Source and destination accounts must be different');
    }

    const requestHash = this.buildRequestHash(
      fromAccountId,
      toAccountId,
      normalizedAmount,
      normalizedDescription,
    );

    const existingRecord = await idempotencyCollection(this.db).findOne({
      sourceAccountId: fromAccountId,
      key: normalizedIdempotencyKey,
    });

    if (existingRecord) {
      return this.replayOrWait(existingRecord, fromAccountId, normalizedIdempotencyKey, requestHash);
    }

    const pendingRecord = this.newPendingRecord(
      fromAccountId,
      normalizedIdempotencyKey,
      requestHash,
      new Date(),
    );

    let pendingRecordId: ObjectId;
    try {
      const inserted = await idempotencyCollection(this.db).insertOne(pendingRecord);
      pendingRecordId = inserted.insertedId;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const concurrentRecord = await this.findIdempotencyRecord(fromAccountId, normalizedIdempotencyKey);
        return this.replayOrWait(concurrentRecord, fromAccountId, normalizedIdempotencyKey, requestHash);
      }
      throw error;
    }

    try {
      return await withMongoSession((session) =>
        this.executeTransfer(
          fromAccountId,
          toAccountId,
          normalizedAmount,
          normalizedDescription,
          normalizedIdempotencyKey,
          pendingRecordId,
          session,
        ),
      );
    } catch (error) {
      if (isDataIntegrityError(error)) {
        await this.cleanupPendingRecord(pendingRecordId, requestHash);
        const currentRecord = await this.findIdempotencyRecord(fromAccountId, normalizedIdempotencyKey);
        return this.replayOrWait(currentRecord, fromAccountId, normalizedIdempotencyKey, requestHash);
      }

      await this.cleanupPendingRecord(pendingRecordId, requestHash);
      throw error;
    }
  }

  async getTransactionByGlobalId(globalId: string): Promise<TransactionView> {
    const decoded = decodeGlobalId(globalId);
    if (decoded.type !== 'Transaction') {
      throw DomainError.validation('Expected Transaction global id');
    }

    const transaction = await transactionsCollection(this.db).findOne({ _id: toObjectId(decoded.id) });
    if (!transaction) {
      throw DomainError.notFound('Transaction not found');
    }

    return this.toView(transaction);
  }

  async listTransactionsByAccount(
    accountGlobalId: string,
    direction: TransactionDirection,
    first: number | null | undefined,
    afterCursor: string | null | undefined,
  ): Promise<ConnectionView<TransactionView>> {
    const size = first == null ? DEFAULT_PAGE_SIZE : first;
    if (size <= 0 || size > MAX_PAGE_SIZE) {
      throw DomainError.validation('first must be between 1 and 100');
    }

    const accountId = await this.accountService.decodeAccountId(accountGlobalId);
    const filter: Filter<TransactionDocument> =
      direction === 'SENT'
        ? { fromAccountId: accountId }
        : { toAccountId: accountId };

    if (afterCursor && afterCursor.length > 0) {
      const decoded = decodeCursor(afterCursor);
      const cursorObjectId = toObjectId(decoded.id, 'Invalid cursor format');
      filter.$or = [
        { createdAt: { $lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $lt: cursorObjectId } },
      ];
    }

    const documents = await transactionsCollection(this.db)
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(size + 1)
      .toArray();

    const hasNextPage = documents.length > size;
    const sliced = hasNextPage ? documents.slice(0, size) : documents;

    const edges = sliced.map((document) => ({
      cursor: encodeCursor(document.createdAt, document._id.toHexString()),
      node: this.toView(document),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: afterCursor != null,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
    };
  }

  async listRecentTransactions(accountGlobalIds: string[], first: number | null | undefined): Promise<RecentTransactionView[]> {
    const size = first == null ? DEFAULT_RECENT_PAGE_SIZE : first;
    if (size <= 0 || size > MAX_PAGE_SIZE) {
      throw DomainError.validation('first must be between 1 and 100');
    }

    if (!accountGlobalIds || accountGlobalIds.length === 0) {
      return [];
    }

    const accountIds = new Set<string>();
    for (const globalId of accountGlobalIds) {
      if (!globalId || globalId.trim().length === 0) {
        throw DomainError.validationField('accountIds', 'Account id is required');
      }
      accountIds.add(await this.accountService.decodeAccountId(globalId));
    }

    const documents = await transactionsCollection(this.db)
      .find({
        $or: [
          { fromAccountId: { $in: Array.from(accountIds) } },
          { toAccountId: { $in: Array.from(accountIds) } },
        ],
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(size)
      .toArray();

    return documents.map((document) => ({
      transaction: this.toView(document),
      type: resolveRecentType(document, accountIds),
    }));
  }

  toView(transaction: WithId<TransactionDocument>): TransactionView {
    return {
      __typename: 'Transaction',
      id: encodeGlobalId('Transaction', transaction._id.toHexString()),
      fromAccountId: encodeGlobalId('Account', transaction.fromAccountId),
      toAccountId: encodeGlobalId('Account', transaction.toAccountId),
      amount: decimalToString(transaction.amount),
      currency: transaction.currency,
      description: transaction.description,
      idempotencyKey: transaction.idempotencyKey,
      createdAt: transaction.createdAt ? transaction.createdAt.toISOString() : null,
    };
  }

  private async executeTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Decimal,
    description: string,
    idempotencyKey: string,
    idempotencyRecordId: ObjectId,
    session: ClientSession,
  ): Promise<TransferFundsPayload> {
    await this.leakyBucketService.assertAllowed(`account:${fromAccountId}:mutation:transferFunds`, session);

    const now = new Date();
    const debitedAccount = await this.debitAccount(fromAccountId, amount, now, session);
    const creditedAccount = await this.creditAccount(toAccountId, amount, now, session);

    const insertedTransaction = await transactionsCollection(this.db).insertOne(
      {
        fromAccountId,
        toAccountId,
        amount: decimalToDecimal128(amount),
        currency: 'BRL',
        description,
        idempotencyKey,
        createdAt: now,
      },
      { session },
    );

    const savedTransaction = await transactionsCollection(this.db).findOne(
      { _id: insertedTransaction.insertedId },
      { session },
    );

    if (!savedTransaction) {
      throw DomainError.badRequest('Unable to process transfer');
    }

    const payload: TransferFundsPayload = {
      transaction: this.toView(savedTransaction),
      fromAccountBalance: decimalToString(debitedAccount.currentBalance),
      toAccountBalance: decimalToString(creditedAccount.currentBalance),
      idempotentReplay: false,
      processedAt: now.toISOString(),
    };

    const serialized = this.serializePayload(payload);

    await idempotencyCollection(this.db).updateOne(
      { _id: idempotencyRecordId },
      {
        $set: {
          responsePayload: serialized,
          status: 'COMPLETED',
          updatedAt: now,
        },
      },
      { session },
    );

    return payload;
  }

  private async debitAccount(
    fromAccountId: string,
    amount: Decimal,
    now: Date,
    session: ClientSession,
  ): Promise<{ currentBalance: unknown; status: AccountStatus }> {
    const updated = await this.db.collection('accounts').findOneAndUpdate(
      {
        _id: toObjectId(fromAccountId, 'Account not found'),
        status: 'ACTIVE',
        currentBalance: { $gte: decimalToDecimal128(amount) },
      },
      {
        $inc: {
          currentBalance: decimalToDecimal128(amount.negated()),
        },
        $set: {
          updatedAt: now,
        },
      },
      {
        returnDocument: 'after',
        session,
      },
    );

    if (!updated) {
      const current = await this.accountService.findById(fromAccountId);
      if (current.status !== 'ACTIVE') {
        ensureStatusActive(current.status);
      }
      throw DomainError.insufficientFunds('Insufficient funds');
    }

    return {
      currentBalance: updated.currentBalance,
      status: updated.status,
    };
  }

  private async creditAccount(
    toAccountId: string,
    amount: Decimal,
    now: Date,
    session: ClientSession,
  ): Promise<{ currentBalance: unknown; status: AccountStatus }> {
    const updated = await this.db.collection('accounts').findOneAndUpdate(
      {
        _id: toObjectId(toAccountId, 'Account not found'),
        status: 'ACTIVE',
      },
      {
        $inc: {
          currentBalance: decimalToDecimal128(amount),
        },
        $set: {
          updatedAt: now,
        },
      },
      {
        returnDocument: 'after',
        session,
      },
    );

    if (!updated) {
      const current = await this.accountService.findById(toAccountId);
      if (current.status !== 'ACTIVE') {
        ensureStatusActive(current.status, true);
      }
      throw DomainError.notFound('Destination account not found');
    }

    return {
      currentBalance: updated.currentBalance,
      status: updated.status,
    };
  }

  private buildRequestHash(
    fromAccountId: string,
    toAccountId: string,
    amount: Decimal,
    description: string,
  ): string {
    return sha256Hex(`${fromAccountId}|${toAccountId}|${amount.toFixed(2)}|${description}`);
  }

  private async replayOrWait(
    record: WithId<IdempotencyRecordDocument>,
    sourceAccountId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<TransferFundsPayload> {
    if (record.requestHash !== requestHash) {
      throw DomainError.conflict('Idempotency key already used with different payload');
    }

    let current = record;
    for (let attempt = 0; attempt < IDEMPOTENCY_POLL_ATTEMPTS; attempt += 1) {
      if (isCompleted(current) && hasText(current.responsePayload)) {
        return this.buildReplayFromRecord(current, requestHash);
      }

      if (!isPending(current)) {
        break;
      }

      await sleep(IDEMPOTENCY_POLL_SLEEP_MS);

      const refreshed = await idempotencyCollection(this.db).findOne({
        sourceAccountId,
        key: idempotencyKey,
      });

      if (!refreshed) {
        throw DomainError.conflict('Idempotency conflict');
      }

      current = refreshed;
    }

    if (isCompleted(current) && hasText(current.responsePayload)) {
      return this.buildReplayFromRecord(current, requestHash);
    }

    throw DomainError.conflict('Idempotency key is currently being processed. Retry with the same idempotency key');
  }

  private async cleanupPendingRecord(idempotencyRecordId: ObjectId, requestHash: string): Promise<void> {
    const record = await idempotencyCollection(this.db).findOne({ _id: idempotencyRecordId });

    if (!record) {
      return;
    }

    if (
      record.requestHash === requestHash &&
      isPending(record) &&
      !hasText(record.responsePayload)
    ) {
      await idempotencyCollection(this.db).deleteOne({ _id: idempotencyRecordId });
    }
  }

  private buildReplayFromRecord(
    record: WithId<IdempotencyRecordDocument>,
    requestHash: string,
  ): TransferFundsPayload {
    if (record.requestHash !== requestHash) {
      throw DomainError.conflict('Idempotency key already used with different payload');
    }

    if (!hasText(record.responsePayload)) {
      throw DomainError.conflict('Idempotency key is currently being processed');
    }

    try {
      const original = JSON.parse(record.responsePayload) as TransferFundsPayload;
      return {
        transaction: original.transaction,
        fromAccountBalance: original.fromAccountBalance,
        toAccountBalance: original.toAccountBalance,
        idempotentReplay: true,
        processedAt: original.processedAt,
      };
    } catch {
      throw DomainError.badRequest('Idempotency replay payload is invalid');
    }
  }

  private serializePayload(payload: TransferFundsPayload): string {
    try {
      return JSON.stringify(payload);
    } catch {
      throw DomainError.badRequest('Unable to persist idempotency payload');
    }
  }

  private normalizeDescription(description: string | null | undefined): string {
    if (description == null) {
      return '';
    }

    const normalized = description.trim();
    if (normalized.length > 140) {
      throw DomainError.validationField('description', 'Description must have at most 140 characters');
    }

    return normalized;
  }

  private normalizeIdempotencyKey(idempotencyKey: string): string {
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw DomainError.validationField('idempotencyKey', 'Idempotency key is required');
    }

    const normalized = idempotencyKey.trim();
    if (normalized.length > 128) {
      throw DomainError.validationField('idempotencyKey', 'Idempotency key must have at most 128 characters');
    }

    return normalized;
  }

  private newPendingRecord(
    sourceAccountId: string,
    key: string,
    requestHash: string,
    now: Date,
  ): IdempotencyRecordDocument {
    return {
      sourceAccountId,
      key,
      requestHash,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.options.idempotencyTtlHours * 3600 * 1000),
    };
  }

  private async findIdempotencyRecord(sourceAccountId: string, key: string): Promise<WithId<IdempotencyRecordDocument>> {
    const record = await idempotencyCollection(this.db).findOne({ sourceAccountId, key });
    if (!record) {
      throw DomainError.conflict('Idempotency conflict');
    }

    return record;
  }
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveRecentType(
  document: TransactionDocument,
  accountIds: Set<string>,
): RecentTransactionType {
  const sent = accountIds.has(document.fromAccountId);
  const received = accountIds.has(document.toAccountId);

  if (sent && received) {
    return 'TRANSFER';
  }

  return received ? 'RECEIVED' : 'SENT';
}

function isCompleted(record: IdempotencyRecordDocument): boolean {
  if (record.status === 'COMPLETED') {
    return true;
  }

  return !record.status && hasText(record.responsePayload);
}

function isPending(record: IdempotencyRecordDocument): boolean {
  if (record.status === 'PENDING') {
    return true;
  }

  return !record.status && !hasText(record.responsePayload);
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as MongoServerError).code === 11000;
}

function isDataIntegrityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as MongoServerError).code;
  return code === 11000 || code === 112 || code === 251;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const transactionInternals = {
  hasText,
  resolveRecentType,
  isCompleted,
  isPending,
  isDuplicateKeyError,
  isDataIntegrityError,
  sleep,
};
