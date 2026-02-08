# CrudBank Frontend

Frontend for the Crud Bank challenge built with React + Vite + Relay + React Router + shadcn/ui.

## Stack

- React 19 + TypeScript
- Vite 7
- React Router 7
- Relay (`react-relay`, `relay-runtime`, `relay-compiler`)
- shadcn/ui + Tailwind CSS
- ESLint
- Vitest + Testing Library

## Prerequisites

- Node.js 20+ (recommended)
- Backend GraphQL API running from `/Users/lorenzoviaroborges/woovi/crudbank/backend` (default: `http://localhost:8080/graphql`)

## Setup

```bash
cd Frontend
cp .env.example .env
npm install
```

Environment variable:

- `VITE_GRAPHQL_URL` (default fallback in code: `http://localhost:8080/graphql`)

## Run

Development server:

```bash
cd Frontend
npm run dev
```

Production preview:

```bash
cd Frontend
npm run build
npm run preview
```

## Scripts

- `npm run dev` - Vite dev server
- `npm run relay` - generate Relay artifacts once
- `npm run relay:watch` - watch mode for Relay artifacts
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run test:watch` - Vitest watch mode
- `npm run build` - Relay compile + TypeScript build + Vite build

## Relay Workflow

1. Keep frontend schema in `Frontend/schema.graphql` aligned with backend.
2. Run `npm run relay` (or `npm run build`) after GraphQL changes.
3. Relay artifacts are generated under `Frontend/src/graphql/__generated__`.

Current dashboard recent transactions use one query:

- `recentTransactions(accountIds, first)` (single backend call, no account fan-out).

## Money Handling

Money calculations in UI use integer cents to avoid floating-point drift:

- `Frontend/src/lib/money.ts`
- totals on dashboard are computed in cents and only formatted to BRL at render.

## Testing

Validation and utility tests:

- `tests/validation-account.test.ts`
- `tests/validation-transfer.test.ts`
- `tests/validation-document.test.ts`
- `tests/graphql-errors.test.ts`
- `tests/money.test.ts`

Critical UI flow test:

- `tests/transfer-dialog.test.tsx`

Run all tests:

```bash
cd Frontend
npm run test
```

## Final Validation Commands

```bash
cd Frontend
npm run lint
npm run test
npm run build
```
