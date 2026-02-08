import supertest from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { bootstrapApplication, type AppBootstrap } from '../../src/app';
import { closeMongo, getMongoDb } from '../../src/config/mongo';

export interface IntegrationAppContext {
  replSet: MongoMemoryReplSet;
  app: AppBootstrap;
  requester: supertest.SuperTest<supertest.Test>;
}

export async function startIntegrationApp(): Promise<IntegrationAppContext> {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { version: '7.0.14' },
  });

  const uri = replSet.getUri('crudbank_test');

  const app = await bootstrapApplication({
    appPort: 0,
    mongodbUri: uri,
    graphqlMaxDepth: 12,
    graphqlMaxComplexity: 300,
    rateLimitCapacity: 100,
    rateLimitLeakPerSecond: 100,
    idempotencyTtlHours: 24,
    seedEnabled: false,
    seedDefaultAccountBalance: '1000.00',
    corsAllowedOrigins: 'http://localhost:*,http://127.0.0.1:*',
  });

  return {
    replSet,
    app,
    requester: supertest(app.app.callback()),
  };
}

export async function stopIntegrationApp(context: IntegrationAppContext): Promise<void> {
  await closeMongo();
  if (context?.replSet) {
    await context.replSet.stop();
  }
}

export async function clearDatabase(): Promise<void> {
  const db = getMongoDb();
  await db.collection('accounts').deleteMany({});
  await db.collection('transactions').deleteMany({});
  await db.collection('idempotency_records').deleteMany({});
  await db.collection('leaky_bucket_state').deleteMany({});
}

export async function gql(
  requester: supertest.SuperTest<supertest.Test>,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await requester.post('/graphql').send({ query, variables });
  return response.body as Record<string, unknown>;
}
