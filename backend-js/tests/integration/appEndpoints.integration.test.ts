import { startIntegrationApp, stopIntegrationApp, clearDatabase, type IntegrationAppContext } from './testApp';

let context: IntegrationAppContext;

beforeAll(async () => {
  context = await startIntegrationApp();
});

afterAll(async () => {
  await stopIntegrationApp(context);
});

beforeEach(async () => {
  await clearDatabase();
});

describe('app endpoints', () => {
  it('exposes health and graphiql endpoints', async () => {
    const health = await context.requester.get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'UP' });

    const graphiql = await context.requester.get('/graphiql');
    expect(graphiql.status).toBe(200);
    expect(graphiql.text).toContain('CrudBank GraphiQL');
    expect(graphiql.text).toContain("url: '/graphql'");
  });

  it('applies CORS origin matching for allowed and blocked origins', async () => {
    const allowed = await context.requester.get('/health').set('origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await context.requester.get('/health').set('origin', 'https://blocked.example.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('maps GraphQL parse errors to BAD_REQUEST', async () => {
    const response = await context.requester
      .post('/graphql')
      .set('content-type', 'application/json')
      .send({ query: 'query {' });

    expect(response.status).toBe(200);
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
  });

  it('executes GraphQL query without variables', async () => {
    const response = await context.requester
      .post('/graphql')
      .set('content-type', 'application/json')
      .send({ query: 'query { __typename }' });

    expect(response.status).toBe(200);
    expect(response.body.data.__typename).toBe('Query');
  });
});
