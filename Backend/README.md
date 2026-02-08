# CrudBank Backend (GraphQL Relay)

Spring Boot backend for the Crud Bank challenge, using Java 21, MongoDB, GraphQL, Relay global IDs/connections, idempotent transfers, and per-account rate limiting.

## Stack

- Java 21
- Spring Boot 3.5.10
- Spring GraphQL
- Spring Data MongoDB
- MongoDB replica set (required for Mongo transactions)
- JUnit 5 + Testcontainers + JaCoCo

## Run

Recommended (Docker):

```bash
cd Backend
docker compose up --build -d
```

Local JVM run:

```bash
cd Backend
mvn spring-boot:run
```

Endpoints:

- GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/actuator/health`

## Environment

```bash
cd Backend
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

## Domain Behavior

- `Transaction` is immutable ledger data.
- `Account.currentBalance` is updated atomically in the same transfer transaction.
- Only `BRL` is supported.
- Account deactivation is soft (`INACTIVE`).

## Transfer Idempotency (Current Semantics)

Idempotency is scoped by `(sourceAccountId, idempotencyKey)` and backed by a unique index in MongoDB.

Status flow:

1. Reserve idempotency record as `PENDING`.
2. Execute transfer transaction.
3. Persist replay payload and mark record `COMPLETED`.

Duplicate key handling:

- Same key + same request hash + `COMPLETED`: immediate replay (`idempotentReplay = true`).
- Same key + different request hash: `CONFLICT`.
- Same key + `PENDING`: short bounded polling (8 attempts x 25ms); if still pending, return `CONFLICT` with retry guidance.

Failure behavior:

- If transfer fails before completion, pending record is cleaned when safe, so retry with same key can proceed.

## GraphQL API

Core operations:

- `createAccount`
- `updateAccount`
- `deactivateAccount`
- `transferFunds`
- `availableBalance`
- `accounts` (Relay connection)
- `transactionsByAccount` (Relay connection)
- `node`

Recent transactions API (additive, non-breaking):

- `recentTransactions(accountIds: [ID!]!, first: Int!): [RecentTransaction!]!`
- `RecentTransaction.type`: `SENT | RECEIVED | TRANSFER` (relative to the account set passed in `accountIds`).

Example:

```graphql
query RecentTransactions($accountIds: [ID!]!, $first: Int!) {
  recentTransactions(accountIds: $accountIds, first: $first) {
    type
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

## Errors

GraphQL errors return `extensions.code`.

Codes used by the API:

- `BAD_REQUEST`
- `NOT_FOUND`
- `CONFLICT`
- `VALIDATION_ERROR`
- `INSUFFICIENT_FUNDS`
- `ACCOUNT_INACTIVE`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

## Quality Gates

Run tests:

```bash
cd Backend
mvn test
```

Run full CI gate (tests + JaCoCo):

```bash
cd Backend
mvn clean verify
```

JaCoCo minimums are enforced in `pom.xml`:

- line coverage >= 90%
- branch coverage >= 90%

## Postman

Collection path:

- `Backend/postman/CrudBankGraphQL.postman_collection.json`

Suggested flow:

1. Create Account A
2. Create Account B
3. Transfer Funds
4. Query Available Balance
5. Query Accounts / Transactions / Recent Transactions
