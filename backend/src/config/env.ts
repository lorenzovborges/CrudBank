import dotenv from 'dotenv';

dotenv.config();

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function parseFloatValue(value: string | undefined, fallback: number): number {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return fallback;
}

export interface AppEnv {
  appPort: number;
  mongodbUri: string;
  graphqlMaxDepth: number;
  graphqlMaxComplexity: number;
  rateLimitCapacity: number;
  rateLimitLeakPerSecond: number;
  idempotencyTtlHours: number;
  seedEnabled: boolean;
  seedDefaultAccountBalance: string;
  corsAllowedOrigins: string;
}

export const env: AppEnv = {
  appPort: parseInteger(process.env.APP_PORT, 8080),
  mongodbUri:
    process.env.MONGODB_URI ??
    'mongodb://localhost:27017/crudbank?replicaSet=rs0',
  graphqlMaxDepth: parseInteger(process.env.GRAPHQL_MAX_DEPTH, 12),
  graphqlMaxComplexity: parseInteger(process.env.GRAPHQL_MAX_COMPLEXITY, 300),
  rateLimitCapacity: parseInteger(process.env.RATE_LIMIT_CAPACITY, 20),
  rateLimitLeakPerSecond: parseFloatValue(process.env.RATE_LIMIT_LEAK_PER_SECOND, 5),
  idempotencyTtlHours: parseInteger(process.env.IDEMPOTENCY_TTL_HOURS, 24),
  seedEnabled: parseBoolean(process.env.SEED_ENABLED, true),
  seedDefaultAccountBalance: process.env.SEED_DEFAULT_ACCOUNT_BALANCE ?? '1000.00',
  corsAllowedOrigins:
    process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:*,http://127.0.0.1:*',
};
