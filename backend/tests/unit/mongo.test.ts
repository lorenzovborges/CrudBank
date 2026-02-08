import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  closeMongo,
  connectMongo,
  decimal128,
  ensureMongoIndexes,
  getMongoClient,
  getMongoDb,
  withMongoSession,
} from '../../src/config/mongo';

describe('mongo config', () => {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 },
      binary: { version: '7.0.14' },
    });
  });

  afterAll(async () => {
    await closeMongo();
    await replSet.stop();
  });

  afterEach(async () => {
    await closeMongo();
  });

  it('throws when db/client is accessed before connection', () => {
    expect(() => getMongoDb()).toThrow('MongoDB is not connected');
    expect(() => getMongoClient()).toThrow('MongoDB client is not connected');
  });

  it('connects, reuses existing connection and creates indexes', async () => {
    const uriWithoutDb = replSet.getUri();

    const db = await connectMongo(uriWithoutDb);
    const reused = await connectMongo(uriWithoutDb);

    expect(reused).toBe(db);

    await ensureMongoIndexes();

    const accountIndexes = await db.collection('accounts').indexExists('account_branch_number_unique');
    const transactionIndexes = await db.collection('transactions').indexExists('transactions_from_created_at');
    const idempotencyTtl = await db.collection('idempotency_records').indexExists('idempotency_expires_at_ttl');
    const bucketIndexes = await db.collection('leaky_bucket_state').indexExists('leaky_bucket_subject_unique');

    expect(accountIndexes).toBe(true);
    expect(transactionIndexes).toBe(true);
    expect(idempotencyTtl).toBe(true);
    expect(bucketIndexes).toBe(true);
  });

  it('runs action inside session transaction and exposes decimal helper', async () => {
    const uri = replSet.getUri('crudbank_test');
    await connectMongo(uri);

    const insertedId = await withMongoSession(async (session) => {
      const db = getMongoDb();
      const inserted = await db.collection('misc').insertOne(
        {
          value: decimal128('12.34'),
        },
        { session },
      );
      return inserted.insertedId.toHexString();
    });

    const found = await getMongoDb().collection('misc').findOne({});

    expect(typeof insertedId).toBe('string');
    expect(decimal128('1.00').toString()).toBe('1.00');
    expect(found).toBeDefined();
  });

  it('closeMongo is safe when already disconnected', async () => {
    await closeMongo();
    await expect(closeMongo()).resolves.toBeUndefined();
  });
});
