import Decimal from 'decimal.js';
import {
  ObjectId,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type WithId,
} from 'mongodb';
import { DomainError } from '../../shared/errors/DomainError';
import { decodeCursor, encodeCursor } from '../../shared/relay/cursorCodec';
import { decodeGlobalId, encodeGlobalId } from '../../shared/relay/globalIdCodec';
import {
  normalizeAccountNumber,
  normalizeBranch,
  normalizeDocument,
  normalizeOwnerName,
} from '../../shared/validators/accountFieldNormalizer';
import { validateNonNegativeAmount } from '../../shared/validators/moneyValidator';
import { decimalToDecimal128, decimalToString, toDecimal } from '../../shared/utils/decimal';

export type AccountStatus = 'ACTIVE' | 'INACTIVE';

type CurrencyCode = 'BRL';

export interface AccountDocument extends Document {
  _id?: ObjectId;
  ownerName: string;
  document: string;
  branch: string;
  number: string;
  currency: CurrencyCode;
  currentBalance: unknown;
  status: AccountStatus;
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountView {
  __typename: 'Account';
  id: string;
  ownerName: string;
  document: string;
  branch: string;
  number: string;
  currency: string;
  currentBalance: string;
  status: string;
  version: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageInfoView {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface ConnectionView<TNode> {
  edges: Array<{ cursor: string; node: TNode }>;
  pageInfo: PageInfoView;
}

function accountCollection(db: Db): Collection<AccountDocument> {
  return db.collection<AccountDocument>('accounts');
}

function toObjectId(id: string, errorMessage = 'Account not found'): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw DomainError.notFound(errorMessage);
  }
  return new ObjectId(id);
}

export class AccountService {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  async createAccount(
    ownerName: string,
    document: string,
    branch: string,
    number: string,
    initialBalance?: unknown,
  ): Promise<AccountView> {
    const normalizedOwnerName = normalizeOwnerName(ownerName);
    const normalizedDocument = normalizeDocument(document);
    const normalizedBranch = normalizeBranch(branch);
    const normalizedNumber = normalizeAccountNumber(number);

    const normalizedBalance =
      initialBalance === null || initialBalance === undefined
        ? new Decimal(0).toDecimalPlaces(2)
        : validateNonNegativeAmount(initialBalance, 'initialBalance');

    const now = new Date();
    const payload: AccountDocument = {
      ownerName: normalizedOwnerName,
      document: normalizedDocument,
      branch: normalizedBranch,
      number: normalizedNumber,
      currency: 'BRL',
      currentBalance: decimalToDecimal128(normalizedBalance),
      status: 'ACTIVE',
      version: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await accountCollection(this.db).insertOne(payload);
      const created = await accountCollection(this.db).findOne({ _id: result.insertedId });
      if (!created) {
        throw DomainError.badRequest('Unable to create account');
      }
      return this.toView(created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw DomainError.conflict('An account with same branch and number already exists');
      }
      throw error;
    }
  }

  async updateAccount(globalId: string, ownerName?: string | null, document?: string | null): Promise<AccountView> {
    const account = await this.findRawByGlobalId(globalId);
    this.ensureAccountActive(account);

    const update: Partial<AccountDocument> = {
      updatedAt: new Date(),
      version: (account.version ?? 0) + 1,
    };

    if (typeof ownerName === 'string' && ownerName.trim().length > 0) {
      update.ownerName = normalizeOwnerName(ownerName);
    }

    if (typeof document === 'string' && document.trim().length > 0) {
      update.document = normalizeDocument(document);
    }

    await accountCollection(this.db).updateOne({ _id: account._id }, { $set: update });
    const updated = await this.findById(account._id.toHexString());
    return this.toView(updated);
  }

  async deactivateAccount(globalId: string): Promise<AccountView> {
    const account = await this.findRawByGlobalId(globalId);

    await accountCollection(this.db).updateOne(
      { _id: account._id },
      {
        $set: {
          status: 'INACTIVE',
          updatedAt: new Date(),
          version: (account.version ?? 0) + 1,
        },
      },
    );

    const updated = await this.findById(account._id.toHexString());
    return this.toView(updated);
  }

  async getByGlobalId(globalId: string): Promise<AccountView> {
    return this.toView(await this.findRawByGlobalId(globalId));
  }

  async listAccounts(first: number | null | undefined, afterCursor: string | null | undefined, statusFilter?: string | null): Promise<ConnectionView<AccountView>> {
    const size = first == null ? 20 : first;
    if (size <= 0 || size > 100) {
      throw DomainError.validation('first must be between 1 and 100');
    }

    const filter: Filter<AccountDocument> = {};

    if (statusFilter && statusFilter.trim().length > 0) {
      if (statusFilter !== 'ACTIVE' && statusFilter !== 'INACTIVE') {
        throw DomainError.validation('Invalid account status');
      }
      filter.status = statusFilter;
    }

    if (afterCursor && afterCursor.length > 0) {
      const decoded = decodeCursor(afterCursor);
      const cursorObjectId = toObjectId(decoded.id, 'Invalid cursor format');
      filter.$or = [
        { createdAt: { $lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $lt: cursorObjectId } },
      ];
    }

    const documents = await accountCollection(this.db)
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

  async findRawByGlobalId(globalId: string): Promise<WithId<AccountDocument>> {
    const decoded = decodeGlobalId(globalId);
    if (decoded.type !== 'Account') {
      throw DomainError.validation('Expected Account global id');
    }
    return this.findById(decoded.id);
  }

  async findById(accountId: string): Promise<WithId<AccountDocument>> {
    const account = await accountCollection(this.db).findOne({ _id: toObjectId(accountId) });
    if (!account) {
      throw DomainError.notFound('Account not found');
    }
    return account;
  }

  async decodeAccountId(globalId: string): Promise<string> {
    const account = await this.findRawByGlobalId(globalId);
    return account._id.toHexString();
  }

  ensureAccountActive(account: WithId<AccountDocument>): void {
    if (account.status !== 'ACTIVE') {
      throw DomainError.accountInactive('Account is inactive');
    }
  }

  toView(account: WithId<AccountDocument>): AccountView {
    return {
      __typename: 'Account',
      id: encodeGlobalId('Account', account._id.toHexString()),
      ownerName: account.ownerName,
      document: account.document,
      branch: account.branch,
      number: account.number,
      currency: account.currency,
      currentBalance: decimalToString(account.currentBalance),
      status: account.status,
      version: account.version == null ? null : String(account.version),
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  async getCurrentBalanceByGlobalId(accountGlobalId: string): Promise<string> {
    const account = await this.findRawByGlobalId(accountGlobalId);
    return decimalToString(account.currentBalance);
  }

  async findByIds(ids: string[]): Promise<Array<WithId<AccountDocument>>> {
    const objectIds = ids.map((id) => toObjectId(id));
    return accountCollection(this.db)
      .find({ _id: { $in: objectIds } })
      .toArray();
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeError = error as { code?: number };
  return maybeError.code === 11000;
}

export function parseDecimalBalance(value: unknown): Decimal {
  return toDecimal(value);
}

export const accountInternals = {
  isDuplicateKeyError,
};
