import { ObjectId, type Db } from 'mongodb';
import { AccountService, accountInternals } from '../../src/modules/account/accountService';
import { DomainError } from '../../src/shared/errors/DomainError';

type AccountCollectionMock = {
  insertOne: jest.Mock<Promise<{ insertedId: ObjectId }>, [Record<string, unknown>]>;
  findOne: jest.Mock<Promise<Record<string, unknown> | null>, [Record<string, unknown>]>;
  updateOne: jest.Mock<Promise<{ modifiedCount: number }>, [Record<string, unknown>, Record<string, unknown>]>;
  find: jest.Mock;
};

function buildDb(collection: AccountCollectionMock): Db {
  return {
    collection: jest.fn().mockReturnValue(collection),
  } as unknown as Db;
}

describe('AccountService internals', () => {
  it('covers duplicate key helper branches', () => {
    expect(accountInternals.isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(accountInternals.isDuplicateKeyError({ code: 10 })).toBe(false);
    expect(accountInternals.isDuplicateKeyError('not-an-object')).toBe(false);
  });

  it('returns BAD_REQUEST when inserted account cannot be loaded', async () => {
    const collection: AccountCollectionMock = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn(),
      find: jest.fn(),
    };

    const service = new AccountService(buildDb(collection));

    await expect(
      service.createAccount('Owner Test', '52998224725', '0001', '99999-1', '10.00'),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'BAD_REQUEST' });
  });

  it('rethrows non-duplicate database errors during createAccount', async () => {
    const collection: AccountCollectionMock = {
      insertOne: jest.fn().mockRejectedValue(new Error('db failure')),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      find: jest.fn(),
    };

    const service = new AccountService(buildDb(collection));

    await expect(
      service.createAccount('Owner Test', '52998224725', '0001', '99999-2', '10.00'),
    ).rejects.toThrow('db failure');
  });
});
