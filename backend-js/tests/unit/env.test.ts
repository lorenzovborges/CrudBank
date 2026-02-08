import type { AppEnv } from '../../src/config/env';

const ORIGINAL_ENV = process.env;

function loadEnvModule(): AppEnv {
  jest.resetModules();
  const loaded = require('../../src/config/env') as { env: AppEnv };
  return loaded.env;
}

describe('env config', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.APP_PORT;
    delete process.env.MONGODB_URI;
    delete process.env.GRAPHQL_MAX_DEPTH;
    delete process.env.GRAPHQL_MAX_COMPLEXITY;
    delete process.env.RATE_LIMIT_CAPACITY;
    delete process.env.RATE_LIMIT_LEAK_PER_SECOND;
    delete process.env.IDEMPOTENCY_TTL_HOURS;
    delete process.env.SEED_ENABLED;
    delete process.env.SEED_DEFAULT_ACCOUNT_BALANCE;
    delete process.env.CORS_ALLOWED_ORIGINS;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads defaults when env vars are absent', () => {
    const env = loadEnvModule();

    expect(env.appPort).toBe(8080);
    expect(env.mongodbUri).toContain('crudbank');
    expect(env.graphqlMaxDepth).toBe(12);
    expect(env.graphqlMaxComplexity).toBe(300);
    expect(env.rateLimitCapacity).toBe(20);
    expect(env.rateLimitLeakPerSecond).toBe(5);
    expect(env.idempotencyTtlHours).toBe(24);
    expect(env.seedEnabled).toBe(true);
    expect(env.seedDefaultAccountBalance).toBe('1000.00');
    expect(env.corsAllowedOrigins).toContain('localhost');
  });

  it('parses configured values and falls back for invalid numbers/booleans', () => {
    process.env.APP_PORT = '9090';
    process.env.MONGODB_URI = 'mongodb://mongo:27017/custom?replicaSet=rs0';
    process.env.GRAPHQL_MAX_DEPTH = '9';
    process.env.GRAPHQL_MAX_COMPLEXITY = '400';
    process.env.RATE_LIMIT_CAPACITY = '30';
    process.env.RATE_LIMIT_LEAK_PER_SECOND = '1.25';
    process.env.IDEMPOTENCY_TTL_HOURS = '36';
    process.env.SEED_ENABLED = 'false';
    process.env.SEED_DEFAULT_ACCOUNT_BALANCE = '42.00';
    process.env.CORS_ALLOWED_ORIGINS = 'https://example.com';

    let env = loadEnvModule();

    expect(env.appPort).toBe(9090);
    expect(env.mongodbUri).toBe('mongodb://mongo:27017/custom?replicaSet=rs0');
    expect(env.graphqlMaxDepth).toBe(9);
    expect(env.graphqlMaxComplexity).toBe(400);
    expect(env.rateLimitCapacity).toBe(30);
    expect(env.rateLimitLeakPerSecond).toBe(1.25);
    expect(env.idempotencyTtlHours).toBe(36);
    expect(env.seedEnabled).toBe(false);
    expect(env.seedDefaultAccountBalance).toBe('42.00');
    expect(env.corsAllowedOrigins).toBe('https://example.com');

    process.env.APP_PORT = 'NaN';
    process.env.RATE_LIMIT_LEAK_PER_SECOND = 'oops';
    process.env.SEED_ENABLED = 'not-bool';
    env = loadEnvModule();

    expect(env.appPort).toBe(8080);
    expect(env.rateLimitLeakPerSecond).toBe(5);
    expect(env.seedEnabled).toBe(true);

    process.env.APP_PORT = '';
    process.env.RATE_LIMIT_LEAK_PER_SECOND = '';
    process.env.SEED_ENABLED = '';
    env = loadEnvModule();

    expect(env.appPort).toBe(8080);
    expect(env.rateLimitLeakPerSecond).toBe(5);
    expect(env.seedEnabled).toBe(true);
  });
});
