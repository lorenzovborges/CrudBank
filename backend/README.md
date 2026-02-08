# CrudBank Backend (GraphQL Relay)

Node.js + Koa + GraphQL backend for CrudBank with Relay global IDs/connections, MongoDB transactions, idempotent transfers, and per-account rate limiting.

## Stack

- Node.js 20+
- TypeScript (strict)
- Koa + graphql-http
- MongoDB replica set (required for transactions)
- Jest + Supertest + mongodb-memory-server

## Run Locally

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/backend
cp .env.example .env
npm ci
npm run dev
```

Default endpoints:

- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/health`

## Docker

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/backend
cp .env.example .env
docker compose up --build -d
```

Custom host port while keeping container internals on `8080`:

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/backend
APP_PORT=18080 MONGO_PORT=37017 docker compose up --build -d
```

Then:

- GraphQL: `http://localhost:18080/graphql`
- GraphiQL: `http://localhost:18080/graphiql`

## Environment Variables

- `APP_PORT` (host port in Docker, listener port in local run)
- `MONGO_PORT` (host-exposed MongoDB port in Docker)
- `MONGODB_URI`
- `GRAPHQL_MAX_DEPTH`
- `GRAPHQL_MAX_COMPLEXITY`
- `RATE_LIMIT_CAPACITY`
- `RATE_LIMIT_LEAK_PER_SECOND`
- `IDEMPOTENCY_TTL_HOURS`
- `SEED_ENABLED`
- `SEED_DEFAULT_ACCOUNT_BALANCE`
- `CORS_ALLOWED_ORIGINS`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run test:coverage`
- `npm run test:smoke`
- `npm run verify`

## Compatibility

- Frontend GraphQL operations smoke tests remain in the backend test suite.
- GraphQL contract stays stable for `VITE_GRAPHQL_URL=http://localhost:8080/graphql`.

## Postman

Collection file:

- `/Users/lorenzoviaroborges/woovi/crudbank/backend/postman/CrudBankGraphQL.postman_collection.json`
