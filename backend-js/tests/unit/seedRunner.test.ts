import type { Db } from 'mongodb';
import { runSeed } from '../../src/modules/seed/seedRunner';

type MockCollection = {
  countDocuments: jest.Mock<Promise<number>, []>;
  insertMany: jest.Mock<Promise<unknown>, [Array<Record<string, unknown>>]>;
};

function buildDb(collection: MockCollection): Db {
  return {
    collection: jest.fn().mockReturnValue(collection),
  } as unknown as Db;
}

describe('seedRunner', () => {
  it('skips when seed is disabled', async () => {
    const collection: MockCollection = {
      countDocuments: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue(undefined),
    };

    await runSeed(buildDb(collection), { enabled: false, defaultAccountBalance: '1000.00' });

    expect(collection.countDocuments).not.toHaveBeenCalled();
    expect(collection.insertMany).not.toHaveBeenCalled();
  });

  it('skips when accounts already exist', async () => {
    const collection: MockCollection = {
      countDocuments: jest.fn().mockResolvedValue(1),
      insertMany: jest.fn().mockResolvedValue(undefined),
    };

    await runSeed(buildDb(collection), { enabled: true, defaultAccountBalance: '1000.00' });

    expect(collection.countDocuments).toHaveBeenCalledTimes(1);
    expect(collection.insertMany).not.toHaveBeenCalled();
  });

  it('inserts two default accounts when enabled and empty', async () => {
    const collection: MockCollection = {
      countDocuments: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue(undefined),
    };

    await runSeed(buildDb(collection), { enabled: true, defaultAccountBalance: '250.50' });

    expect(collection.insertMany).toHaveBeenCalledTimes(1);
    const [payload] = collection.insertMany.mock.calls[0];
    expect(payload).toHaveLength(2);
    expect(payload[0].currentBalance.toString()).toBe('250.50');
    expect(payload[1].currentBalance.toString()).toBe('250.50');
  });

  it('falls back to 1000.00 when default balance is blank', async () => {
    const collection: MockCollection = {
      countDocuments: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue(undefined),
    };

    await runSeed(buildDb(collection), { enabled: true, defaultAccountBalance: '' });

    const [payload] = collection.insertMany.mock.calls[0];
    expect(payload[0].currentBalance.toString()).toBe('1000.00');
    expect(payload[1].currentBalance.toString()).toBe('1000.00');
  });
});
