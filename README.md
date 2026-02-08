# CrudBank

Este repositório usa uma única implementação de backend:

- Backend: `/Users/lorenzoviaroborges/woovi/crudbank/backend`
- Frontend: `/Users/lorenzoviaroborges/woovi/crudbank/frontend`

## Contrato e Porta

- Endpoint GraphQL: `http://localhost:8080/graphql`
- GraphiQL: `http://localhost:8080/graphiql`
- Health: `http://localhost:8080/health`

Para o frontend, mantenha:

- `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

## Execução Rápida

Backend:

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/backend
cp .env.example .env
npm ci
npm run dev
```

Frontend:

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/frontend
cp .env.example .env
npm install
npm run dev
```

## Referências

- Guia do backend: `/Users/lorenzoviaroborges/woovi/crudbank/backend/README.md`
- Guia do frontend: `/Users/lorenzoviaroborges/woovi/crudbank/frontend/README.md`
