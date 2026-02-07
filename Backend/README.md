# CrudBank Backend (GraphQL Relay)

A Docker-first backend for the Woovi Crud Bank challenge built with **Spring Boot 3.5.10** and **Java 21**.

This API is intentionally **public (no authentication)** and focuses only on banking domain operations:
- Account creation, update, deactivation, and listing
- Money transfer between accounts
- Available balance calculation
- Relay-compatible GraphQL schema (`Node`, global IDs, `Connection`, `Edge`, `PageInfo`)
- Idempotent transfers scoped by `fromAccountId + idempotencyKey`
- Leaky bucket rate limiting scoped by source account

## Project Overview

The backend follows a consistency-first model for financial operations:
- Transfers are executed inside MongoDB transactions.
- `Transaction` is immutable ledger data.
- `Account.currentBalance` is an atomic snapshot for fast reads.
- Idempotency prevents duplicate transfer processing during retries.

## Stack and Architecture Decisions

### Technology
- Java 21
- Spring Boot 3.5.10
- Spring GraphQL
- Spring Data MongoDB
- MongoDB replica set (required for transactions)
- JUnit 5, Spring Boot Test, Spring GraphQL Test, Testcontainers
- JaCoCo coverage gate

### Architecture
Subject-based modules with internal layering:
- `account`
- `transaction`
- `balance`
- `ratelimit`
- `shared`

Each module separates API, application service, domain, and infrastructure concerns.

## Prerequisites

Recommended flow:
- Docker Desktop (or Docker Engine + Docker Compose plugin)

Optional local flow:
- Java 21
- Maven 3.9+

## Configure Environment

```bash
cp .env.example .env
```

Main variables:
- `APP_PORT`
- `MONGODB_URI`
- `GRAPHQL_MAX_DEPTH`
- `GRAPHQL_MAX_COMPLEXITY`
- `RATE_LIMIT_CAPACITY`
- `RATE_LIMIT_LEAK_PER_SECOND`
- `IDEMPOTENCY_TTL_HOURS`
- `SEED_ENABLED`
- `SEED_DEFAULT_ACCOUNT_BALANCE`
- `CORS_ALLOWED_ORIGINS`

## Run Full Stack with Docker (Recommended)

From `/Backend`:

```bash
docker compose up --build -d
```

Check services:

```bash
docker compose ps
```

Follow API logs:

```bash
docker compose logs -f app
```

Stop stack:

```bash
docker compose down
```

Clean reset (including Mongo volume):

```bash
docker compose down -v
```

### Endpoints
- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/actuator/health`

## Optional Local Run (Without Containerized App)

```bash
mvn spring-boot:run
```

## GraphiQL Sample Operations

### Create Account

```graphql
mutation CreateAccount($input: CreateAccountInput!) {
  createAccount(input: $input) {
    id
    ownerName
    branch
    number
    currentBalance
    status
  }
}
```

Variables:

```json
{
  "input": {
    "ownerName": "Alice",
    "document": "12345678901",
    "branch": "0001",
    "number": "12345-6",
    "initialBalance": "1000.00"
  }
}
```

### Transfer Funds

```graphql
mutation Transfer($input: TransferFundsInput!) {
  transferFunds(input: $input) {
    idempotentReplay
    fromAccountBalance
    toAccountBalance
    transaction {
      id
      fromAccountId
      toAccountId
      amount
      description
      createdAt
    }
  }
}
```

### Available Balance

```graphql
query Balance($accountId: ID!) {
  availableBalance(accountId: $accountId)
}
```

## Relay Pagination Usage

### Accounts connection

```graphql
query Accounts($first: Int!, $after: String, $status: AccountStatus) {
  accounts(first: $first, after: $after, status: $status) {
    edges {
      cursor
      node {
        id
        ownerName
        status
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

### Node lookup

```graphql
query Node($id: ID!) {
  node(id: $id) {
    id
    ... on Account {
      ownerName
      currentBalance
    }
    ... on Transaction {
      amount
      description
    }
  }
}
```

## Business Rules and Error Codes

### Core rules
- Currency is BRL only.
- Transfer amount must be positive and use 2 decimal places.
- Source and destination accounts must be different.
- Inactive accounts cannot send or receive transfers.
- Insufficient funds fail atomically.
- Account removal is soft delete (`INACTIVE`) only.
- Account `branch` and `number` are immutable after creation.
- `idempotencyKey` is required for `transferFunds`.

### Error format
GraphQL errors use `extensions.code`.

Possible values:
- `BAD_REQUEST`
- `NOT_FOUND`
- `CONFLICT`
- `VALIDATION_ERROR`
- `INSUFFICIENT_FUNDS`
- `ACCOUNT_INACTIVE`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

`RATE_LIMITED` includes `retryAfterSeconds` in `extensions`.

## Tests and Coverage

Run tests:

```bash
mvn test
```

Run full verification with coverage gate:

```bash
mvn clean verify
```

JaCoCo line and branch checks are enforced by the build.

## Postman Collection

Collection file:
- `postman/CrudBankGraphQL.postman_collection.json`

Import it and run requests in this sequence:
1. Create Account A
2. Create Account B
3. Transfer Funds
4. Available Balance
5. List Accounts (Relay)
6. Transactions By Account

Default variables:
- `baseUrl` = `http://localhost:8080`
- `fromAccountId`
- `toAccountId`
- `idempotencyKey`

## Troubleshooting

- If transfer operations fail due to transaction support, ensure Mongo replica set is up (`mongo` + `mongo-init-replica` services).
- If you changed indexes or idempotency strategy, reset local data:
  ```bash
  docker compose down -v
  docker compose up --build -d
  ```
- If app starts before Mongo is healthy, inspect startup order:
  ```bash
  docker compose logs -f mongo mongo-init-replica app
  ```
