import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, simpleEstimator } from 'graphql-query-complexity';
import { createHandler } from 'graphql-http/lib/use/koa';
import { connectMongo, ensureMongoIndexes, getMongoDb } from './config/mongo';
import { buildCorsOriginMatcher } from './config/cors';
import type { AppEnv } from './config/env';
import { buildExecutableSchema } from './graphql/buildSchema';
import { formatGraphQLError } from './shared/errors/graphqlErrorFormatter';
import { AccountService } from './modules/account/accountService';
import { BalanceService } from './modules/balance/balanceService';
import { LeakyBucketService } from './modules/ratelimit/leakyBucketService';
import { TransactionService } from './modules/transaction/transactionService';
import { runSeed } from './modules/seed/seedRunner';
import type { GraphQLServices } from './graphql/context';

export interface AppBootstrap {
  app: Koa;
  services: GraphQLServices;
}

export async function bootstrapApplication(config: AppEnv): Promise<AppBootstrap> {
  await connectMongo(config.mongodbUri);
  await ensureMongoIndexes();

  const db = getMongoDb();
  const accountService = new AccountService(db);
  const balanceService = new BalanceService(accountService);
  const leakyBucketService = new LeakyBucketService(db, {
    capacity: config.rateLimitCapacity,
    leakPerSecond: config.rateLimitLeakPerSecond,
  });
  const transactionService = new TransactionService(
    db,
    accountService,
    leakyBucketService,
    { idempotencyTtlHours: config.idempotencyTtlHours },
  );

  await runSeed(db, {
    enabled: config.seedEnabled,
    defaultAccountBalance: config.seedDefaultAccountBalance,
  });

  const services: GraphQLServices = {
    accountService,
    balanceService,
    transactionService,
  };

  const app = new Koa();
  const router = new Router();
  const schema = buildExecutableSchema();
  const originMatcher = buildCorsOriginMatcher(config.corsAllowedOrigins);

  app.use(
    cors({
      origin: (ctx) => {
        const requestOrigin = ctx.get('origin') || undefined;
        const matched = originMatcher(requestOrigin);
        return matched || '';
      },
      allowMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['*'],
      credentials: false,
      maxAge: 3600,
    }),
  );

  app.use(bodyParser({ enableTypes: ['json'] }));

  router.get('/health', (ctx) => {
    ctx.status = 200;
    ctx.body = {
      status: 'UP',
    };
  });

  router.get('/graphiql', (ctx) => {
    ctx.type = 'text/html';
    ctx.body = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>CrudBank GraphiQL</title>
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
  </head>
  <body style="margin:0;overflow:hidden;">
    <div id="graphiql" style="height:100vh;"></div>
    <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
    <script>
      const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
      ReactDOM.render(
        React.createElement(GraphiQL, { fetcher }),
        document.getElementById('graphiql')
      );
    </script>
  </body>
</html>`;
  });

  const graphqlHandler = createHandler({
    schema,
    context: () => ({ services }),
    validationRules: (_req, args, specifiedRules) => [
      ...specifiedRules,
      depthLimit(config.graphqlMaxDepth),
      createComplexityRule({
        maximumComplexity: config.graphqlMaxComplexity,
        variables: (args.variableValues ?? {}) as Record<string, unknown>,
        estimators: [simpleEstimator({ defaultComplexity: 1 })],
      }),
    ],
    formatError: formatGraphQLError,
  });

  router.all('/graphql', graphqlHandler);

  app.use(router.routes());
  app.use(router.allowedMethods());

  return { app, services };
}
