# CrudBank

CrudBank is a fullstack banking CRUD application with a GraphQL API and a Relay-based frontend.

It covers the core banking flows:

- Create and manage accounts
- Send and receive transfers between accounts
- Calculate and query available balance
- Browse accounts and transactions with Relay-style pagination

## Tech Stack

### Backend

- Node.js 20+
- TypeScript (strict)
- Koa
- GraphQL (`graphql-http`)
- MongoDB (replica set for transactions)
- Jest + Supertest + mongodb-memory-server

### Frontend

- React 19 + TypeScript
- Vite
- React Router
- Relay (`react-relay`, `relay-runtime`, `relay-compiler`)
- shadcn/ui + Tailwind
- Vitest + Testing Library

## Core Functionality

### Accounts

- Create account (`createAccount`)
- Update account (`updateAccount`)
- Deactivate account (`deactivateAccount`)
- List accounts with Relay connection (`accounts`)

### Transactions

- Transfer funds (`transferFunds`)
- List transactions by account and direction (`transactionsByAccount`)
- Recent transactions by account set (`recentTransactions`)

### Balances

- Available balance query (`availableBalance`)

### Reliability and Consistency

- MongoDB transactions for transfer integrity
- Idempotency key support for transfer safety
- Per-account leaky-bucket rate limiting
- Decimal-safe money handling with `decimal.js`

## API Endpoints

Default backend endpoints:

- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/health`

Frontend GraphQL target:

- `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

## GraphQL Contract Overview

Main schema elements (from `backend/src/graphql/schema.graphqls`):

- Types: `Account`, `Transaction`, `TransferFundsPayload`, `RecentTransaction`
- Relay support: `Node`, `AccountConnection`, `TransactionConnection`, `PageInfo`
- Queries: `node`, `account`, `accounts`, `transaction`, `transactionsByAccount`, `recentTransactions`, `availableBalance`
- Mutations: `createAccount`, `updateAccount`, `deactivateAccount`, `transferFunds`

## Repository Structure

```text
crudbank
├── backend
│   ├── src
│   ├── tests
│   ├── postman
│   ├── docker-compose.yml
│   └── package.json
├── frontend
│   ├── src
│   ├── tests
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 20+
- npm
- Docker + Docker Compose (optional but recommended for backend MongoDB setup)

## Running Locally

### 1) Start backend

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

### 2) Start frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Running Backend with Docker

### Default ports

```bash
cd backend
cp .env.example .env
docker compose up --build -d
```

### Custom host ports

If `27017` is already in use:

```bash
cd backend
APP_PORT=18080 MONGO_PORT=37017 docker compose up --build -d
```

Backend will be available at:

- `http://localhost:18080/graphql`
- `http://localhost:18080/graphiql`
- `http://localhost:18080/health`

## Environment Variables

### Backend (`backend/.env`)

- `APP_PORT=8080`
- `MONGO_PORT=27017`
- `MONGODB_URI=mongodb://localhost:27017/crudbank?replicaSet=rs0`
- `GRAPHQL_MAX_DEPTH=12`
- `GRAPHQL_MAX_COMPLEXITY=300`
- `RATE_LIMIT_CAPACITY=20`
- `RATE_LIMIT_LEAK_PER_SECOND=5`
- `IDEMPOTENCY_TTL_HOURS=24`
- `SEED_ENABLED=true`
- `SEED_DEFAULT_ACCOUNT_BALANCE=1000.00`
- `CORS_ALLOWED_ORIGINS=http://localhost:*,http://127.0.0.1:*`

### Frontend (`frontend/.env`)

- `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

## Testing and Quality Gates

### Backend

```bash
cd backend
npm run lint
npm run build
npm run test
npm run test:coverage
npm run test:smoke
npm run verify
```

### Frontend

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Postman

Import collection:

- `backend/postman/CrudBankGraphQL.postman_collection.json`

Suggested API flow:

1. Create Account A
2. Create Account B
3. Transfer Funds
4. Query `availableBalance`
5. Query `accounts` and `transactionsByAccount`

## Deployment Checklist

- Backend deployed and reachable
- Frontend deployed and pointing to the backend GraphQL URL
- Lint, build and tests passing before release
