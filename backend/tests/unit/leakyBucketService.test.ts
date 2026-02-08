import type { Db } from 'mongodb';
import { DomainError } from '../../src/shared/errors/DomainError';
import { LeakyBucketService } from '../../src/modules/ratelimit/leakyBucketService';

type StateDocument = {
  _id: string;
  subject: string;
  waterLevel: number;
  lastLeakAt: Date;
  updatedAt: Date;
  version: number;
};

type MockCollection = {
  findOne: jest.Mock<Promise<StateDocument | null>, [Record<string, unknown>, Record<string, unknown>?]>;
  insertOne: jest.Mock<Promise<unknown>, [Record<string, unknown>, Record<string, unknown>?]>;
  updateOne: jest.Mock<Promise<{ modifiedCount: number }>, [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>?]>;
};

function buildDb(collection: MockCollection): Db {
  return {
    collection: jest.fn().mockReturnValue(collection),
  } as unknown as Db;
}

describe('LeakyBucketService', () => {
  it('allows request when state is inserted', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      updateOne: jest.fn(),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).resolves.toBeUndefined();
    expect(collection.insertOne).toHaveBeenCalledTimes(1);
  });

  it('allows request when existing state is updated optimistically', async () => {
    const now = new Date();
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'id-1',
        subject: 'account:1',
        waterLevel: 0.1,
        lastLeakAt: new Date(now.getTime() - 1_000),
        updatedAt: now,
        version: 0,
      }),
      insertOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).resolves.toBeUndefined();
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('returns RATE_LIMITED with retryAfterSeconds when over capacity', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'id-1',
        subject: 'account:1',
        waterLevel: 50,
        lastLeakAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      }),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 1, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'RATE_LIMITED',
      details: expect.objectContaining({ retryAfterSeconds: expect.any(Number) }) as Record<string, unknown>,
    });
  });

  it('fails with BAD_REQUEST when duplicate inserts keep happening', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockRejectedValue({ code: 11000 }),
      updateOne: jest.fn(),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'BAD_REQUEST',
    });

    expect(collection.insertOne).toHaveBeenCalledTimes(5);
  });

  it('fails with BAD_REQUEST when optimistic updates keep missing', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: 'id-1',
        subject: 'account:1',
        waterLevel: 0,
        lastLeakAt: new Date(Date.now() - 1_000),
        updatedAt: new Date(),
        version: 0,
      }),
      insertOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'BAD_REQUEST',
    });

    expect(collection.updateOne).toHaveBeenCalledTimes(5);
  });

  it('rethrows non-duplicate insert errors', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockRejectedValue(new Error('insert failed')),
      updateOne: jest.fn(),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).rejects.toThrow('insert failed');
  });

  it('treats non-object insert failures as non-duplicate errors', async () => {
    const collection: MockCollection = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockRejectedValue('string-failure'),
      updateOne: jest.fn(),
    };

    const service = new LeakyBucketService(buildDb(collection), { capacity: 10, leakPerSecond: 1 });

    await expect(service.assertAllowed('account:1')).rejects.toBe('string-failure');
  });
});
