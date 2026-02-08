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

describe('performance smoke', () => {
  it('processes concurrent transfers with balance integrity', async () => {
    const source = await createAccount(context.requester, 'Perf Source', '52998224725', '0001', '70000-1', '5000.00');
    const destinationA = await createAccount(context.requester, 'Perf Dest A', '02306078106', '0001', '70000-2', '100.00');
    const destinationB = await createAccount(context.requester, 'Perf Dest B', '39053344705', '0001', '70000-3', '100.00');

    const mutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) {
          transaction { id }
          idempotentReplay
        }
      }
    `;

    const start = Date.now();

    const transfers = Array.from({ length: 20 }).map((_, index) => {
      const toAccountId = index % 2 === 0 ? destinationA : destinationB;
      return gql(context.requester, mutation, {
        input: {
          fromAccountId: source,
          toAccountId,
          amount: '10.00',
          description: `Perf ${index}`,
          idempotencyKey: `perf-smoke-${index}`,
        },
      });
    });

    const responses = await Promise.all(transfers);
    const elapsedMs = Date.now() - start;

    for (const response of responses) {
      expect(response.errors).toBeUndefined();
      expect(response.data.transferFunds.idempotentReplay).toBe(false);
    }

    const balanceQuery = `
      query Balance($id: ID!) {
        availableBalance(accountId: $id)
      }
    `;

    const sourceBalance = await gql(context.requester, balanceQuery, { id: source });
    const destinationABalance = await gql(context.requester, balanceQuery, { id: destinationA });
    const destinationBBalance = await gql(context.requester, balanceQuery, { id: destinationB });

    expect(sourceBalance.data.availableBalance).toBe('4800.00');
    expect(destinationABalance.data.availableBalance).toBe('200.00');
    expect(destinationBBalance.data.availableBalance).toBe('200.00');

    // Smoke-level budget to detect major regressions while keeping CI stable.
    expect(elapsedMs).toBeLessThan(8_000);
  });
});
