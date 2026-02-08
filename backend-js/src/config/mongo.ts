import {
  MongoClient,
  type Db,
  Decimal128,
  type Document,
  type Collection,
  type ClientSession,
} from 'mongodb';

let client: MongoClient | null = null;
let database: Db | null = null;

function getDbNameFromUri(uri: string): string {
  try {
    const normalized = uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://') ? uri : `mongodb://${uri}`;
    const parsed = new URL(normalized.replace('mongodb://', 'http://').replace('mongodb+srv://', 'http://'));
    const pathname = parsed.pathname.replace(/^\//, '');
    return pathname.length > 0 ? pathname : 'crudbank';
  } catch {
    return 'crudbank';
  }
}

export async function connectMongo(uri: string): Promise<Db> {
  if (database) {
    return database;
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(getDbNameFromUri(uri));
  return database;
}

export function getMongoDb(): Db {
  if (!database) {
    throw new Error('MongoDB is not connected');
  }
  return database;
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client is not connected');
  }
  return client;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
  }
  client = null;
  database = null;
}

async function ensureCollection<TSchema extends Document>(name: string): Promise<Collection<TSchema>> {
  const db = getMongoDb();
  return db.collection<TSchema>(name);
}

export async function ensureMongoIndexes(): Promise<void> {
  const accounts = await ensureCollection<Document>('accounts');
  await accounts.createIndex({ branch: 1, number: 1 }, { unique: true, name: 'account_branch_number_unique' });
  await accounts.createIndex({ createdAt: -1, _id: -1 }, { name: 'accounts_created_at_desc_id_desc' });

  const transactions = await ensureCollection<Document>('transactions');
  await transactions.createIndex({ fromAccountId: 1, createdAt: -1 }, { name: 'transactions_from_created_at' });
  await transactions.createIndex({ toAccountId: 1, createdAt: -1 }, { name: 'transactions_to_created_at' });
  await transactions.createIndex({ createdAt: -1, _id: -1 }, { name: 'transactions_created_at_desc_id_desc' });

  const idempotency = await ensureCollection<Document>('idempotency_records');
  await idempotency.createIndex(
    { sourceAccountId: 1, key: 1 },
    { unique: true, name: 'idempotency_source_account_key_unique' },
  );
  await idempotency.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'idempotency_expires_at_ttl' },
  );

  const leakyBucket = await ensureCollection<Document>('leaky_bucket_state');
  await leakyBucket.createIndex({ subject: 1 }, { unique: true, name: 'leaky_bucket_subject_unique' });
}

export function decimal128(value: string): Decimal128 {
  return Decimal128.fromString(value);
}

export async function withMongoSession<T>(
  action: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const mongoClient = getMongoClient();
  const session = mongoClient.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await action(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
