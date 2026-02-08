# CrudBank Backend JS (GraphQL Relay)

Node.js + Koa + GraphQL backend for CrudBank with Relay global IDs/connections, MongoDB transactions, idempotent transfers, and per-account rate limiting.

## Stack

- Node.js 20+
- TypeScript (strict)
- Koa + graphql-http
- MongoDB replica set (required for transactions)
- Jest + Supertest + mongodb-memory-server

## Run Locally

```bash
cd backend-js
cp .env.example .env
npm ci
npm run dev
```

Endpoints (default):

- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/health`

## Docker

```bash
cd backend-js
cp .env.example .env
docker compose up --build -d
```

Custom host port while keeping container internals stable on `8080`:

```bash
cd backend-js
APP_PORT=18080 MONGO_PORT=37017 docker compose up --build -d
```

Then:

- GraphQL: `http://localhost:18080/graphql`
- GraphiQL: `http://localhost:18080/graphiql`

## Backend Replacement with Java Version

`backend-js` is designed to replace `backend-java` transparently for frontend usage.

- Keep GraphQL contract unchanged.
- Switch only frontend endpoint (`VITE_GRAPHQL_URL`) between Java and JS backends.

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
- `npm run test:parity`
- `npm run verify`

## Parity and Compatibility

- Schema byte parity test against `backend-java` SDL.
- Frontend GraphQL operations smoke tests.
- Runtime parity script comparing Java vs JS GraphQL behavior.

## Postman

Collection file:

- `backend-js/postman/CrudBankGraphQL.postman_collection.json`
