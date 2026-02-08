# CrudBank

Este repositório possui duas implementacoes de backend com o mesmo contrato GraphQL para o frontend:

- `/Users/lorenzoviaroborges/woovi/crudbank/backend-java` (Spring Boot / Java)
- `/Users/lorenzoviaroborges/woovi/crudbank/backend-js` (Koa / Node.js / TypeScript)

O frontend esta em:

- `/Users/lorenzoviaroborges/woovi/crudbank/frontend`

## Como usar as duas versoes

1. As duas versoes expõem o mesmo endpoint GraphQL (`/graphql`) e foram preparadas para substituicao transparente no frontend.
2. No modo substituicao 1:1, rode somente um backend por vez na porta `8080`.
3. Para trocar Java por JS (ou vice-versa), basta alterar `VITE_GRAPHQL_URL` no frontend.

Exemplo:

- Java: `VITE_GRAPHQL_URL=http://localhost:8080/graphql`
- JS: `VITE_GRAPHQL_URL=http://localhost:8080/graphql`

## Rodar em paralelo (comparacao)

Se quiser subir os dois ao mesmo tempo na mesma maquina, use portas diferentes no host:

1. `backend-java` em `8080`
2. `backend-js` em `18080` (por exemplo)

Exemplo backend-js:

```bash
cd /Users/lorenzoviaroborges/woovi/crudbank/backend-js
APP_PORT=18080 MONGO_PORT=37017 docker compose up --build -d
```

Com isso:

- Java GraphQL: `http://localhost:8080/graphql`
- JS GraphQL: `http://localhost:18080/graphql`

## Referencias

- Guia Java: `/Users/lorenzoviaroborges/woovi/crudbank/backend-java/README.md`
- Guia JS: `/Users/lorenzoviaroborges/woovi/crudbank/backend-js/README.md`
- Guia Frontend: `/Users/lorenzoviaroborges/woovi/crudbank/frontend/README.md`
