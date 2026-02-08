import { decodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { getMongoDb } from '../../src/config/mongo';
import { clearDatabase, gql, startIntegrationApp, stopIntegrationApp, type IntegrationAppContext } from './testApp';
import { createAccount } from './helpers/graphqlHelpers';

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

describe('Rate limit integration', () => {
  it('rejects transfer when rate limit is exceeded', async () => {
    const accountA = await createAccount(context.requester, 'Alice', '52998224725', '0001', '71717-1', '1000.00');
    const accountB = await createAccount(context.requester, 'Bob', '02306078106', '0001', '72727-2', '1000.00');

    const decodedFrom = decodeGlobalId(accountA).id;

    await getMongoDb().collection('leaky_bucket_state').insertOne({
      subject: `account:${decodedFrom}:mutation:transferFunds`,
      waterLevel: 10000,
      lastLeakAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    });

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) { transaction { id } }
      }
    `;

    const response = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '1.00',
        description: 'Rate limited',
        idempotencyKey: 'idem-rate-1',
      },
    });

    expect(response.errors[0].extensions.code).toBe('RATE_LIMITED');
  });
});
