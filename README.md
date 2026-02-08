# CrudBank - Woovi Challenge (GraphQL Relay)

This repository is a fullstack implementation of the **Woovi Challenge - Crud Bank GraphQL Relay**.

It delivers a bank-like flow where users can:

- Create and manage accounts
- Send and receive transactions
- Check available balance
- Browse accounts and transactions with Relay-style pagination

The project is open source and organized as a single backend + frontend solution:

- Backend: `backend`
- Frontend: `frontend`

## Challenge Context

Woovi challenge summary:

- Theme: Bank CRUD
- Backend stack: **Node.js, Koa, MongoDB, GraphQL**
- Frontend stack: **React, Relay**
- Testing: **Jest** (backend) and frontend test runner
- Goal: reproduce startup-like day-to-day delivery, balancing code quality and business decisions

Reference:

- Woovi Stack: [https://dev.to/woovi/woovi-stack-5fom](https://dev.to/woovi/woovi-stack-5fom)

## Requirement Coverage

### Backend

- GraphQL API implemented with `graphql-http`
- MongoDB persistence with transaction support (replica set)
- Account and Transaction collections
- Transfer flow between two accounts
- Available balance calculation
- Relay `Node` interface and connection pagination
- GraphiQL endpoint exposed
- Postman collection included
- Automated tests with Jest

### Frontend

- React + Vite + React Router
- Relay integration with generated artifacts
- shadcn/ui components
- Account creation and transfer actions
- Dashboard and transaction visualization
- Frontend tests included

## Architecture Overview

### Backend

- Runtime: Node.js 20+ with TypeScript strict mode
- HTTP server: Koa
- GraphQL endpoints: `/graphql`, `/graphiql`, `/health`
- Data consistency: MongoDB transactions for transfers, idempotency keys, per-account leaky-bucket rate limiting, and monetary precision with `decimal.js`

### Frontend

- React 19 + TypeScript
- Vite build/dev server
- Relay + GraphQL operations
- React Router navigation
- UI built with shadcn + Tailwind

## GraphQL Contract

Main types and operations (from `backend/src/graphql/schema.graphqls`):

- Types: `Account`, `Transaction`, `TransferFundsPayload`, `RecentTransaction`
- Relay: `Node`, `AccountConnection`, `TransactionConnection`, `PageInfo`
- Queries: `node`, `account`, `accounts`, `transaction`, `transactionsByAccount`, `recentTransactions`, `availableBalance`
- Mutations: `createAccount`, `updateAccount`, `deactivateAccount`, `transferFunds`

Default backend URLs:

- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/health`

Frontend must point to:

- `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

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
- Docker + Docker Compose (optional, recommended for backend MongoDB setup)

## Local Setup and Run

### 1) Backend (local)

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

### 2) Frontend (local)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Backend with Docker

### Default ports

```bash
cd backend
cp .env.example .env
docker compose up --build -d
```

### Custom host ports

Useful when host `27017` is already in use:

```bash
cd backend
APP_PORT=18080 MONGO_PORT=37017 docker compose up --build -d
```

Then backend is available at:

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

## Testing and Quality

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

## API Testing with Postman

Import:

- `backend/postman/CrudBankGraphQL.postman_collection.json`

Suggested flow:

1. Create Account A
2. Create Account B
3. Transfer Funds
4. Query `availableBalance`
5. Query `accounts` and `transactionsByAccount`

## Deployment Notes

- Backend must be reachable for review (challenge requirement).
- Frontend must be deployed in production for review (challenge requirement).
- This repository is open source as required by the challenge.

## Extra Challenge Notes

From the original challenge:

- Better backend chances: GraphQL playground, Postman collection, `graphql-http`, tests
- Better frontend chances: shadcn, latest Vite + Router, Storybook, dashboard quality, tests
- Senior scope (optional): subject-based architecture and Woovi Leaky Bucket design
