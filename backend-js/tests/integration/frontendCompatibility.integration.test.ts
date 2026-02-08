import fs from 'fs';
import path from 'path';
import { startIntegrationApp, stopIntegrationApp, clearDatabase, gql, type IntegrationAppContext } from './testApp';
import { createAccount, transferFunds } from './helpers/graphqlHelpers';

type OperationFixture = {
  file: string;
  variables: Record<string, unknown>;
};

function loadOperation(file: string): string {
  const filePath = path.resolve(process.cwd(), '..', 'Frontend', 'src', 'graphql', file);
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/graphql`([\s\S]*?)`/);
  if (!match) {
    throw new Error(`Unable to extract GraphQL operation from ${file}`);
  }
  return match[1].trim();
}

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

describe('frontend GraphQL compatibility smoke', () => {
  it('executes real operations from Frontend/src/graphql without contract changes', async () => {
    const accountA = await createAccount(context.requester, 'Alice Front', '52998224725', '0001', '90090-1', '1000.00');
    const accountB = await createAccount(context.requester, 'Bob Front', '02306078106', '0001', '90090-2', '500.00');

    await transferFunds(context.requester, {
      fromAccountId: accountA,
      toAccountId: accountB,
      amount: '25.00',
      description: 'Frontend seed transfer',
      idempotencyKey: 'frontend-smoke-1',
    });

    const operationFixtures: OperationFixture[] = [
      {
        file: 'AccountsQuery.ts',
        variables: { first: 10, after: null },
      },
      {
        file: 'AvailableBalanceQuery.ts',
        variables: { accountId: accountA },
      },
      {
        file: 'CreateAccountMutation.ts',
        variables: {
          input: {
            ownerName: 'Created from frontend op',
            document: '39053344705',
            branch: '0002',
            number: '80000-1',
            initialBalance: '0.00',
          },
        },
      },
      {
        file: 'DashboardQuery.ts',
        variables: {},
      },
      {
        file: 'DeactivateAccountMutation.ts',
        variables: { input: { id: accountB } },
      },
      {
        file: 'RecentTransactionsQuery.ts',
        variables: { accountIds: [accountA, accountB], first: 10 },
      },
      {
        file: 'TransactionsByAccountQuery.ts',
        variables: {
          accountId: accountA,
          direction: 'SENT',
          first: 10,
          after: null,
        },
      },
      {
        file: 'TransferFundsMutation.ts',
        variables: {
          input: {
            fromAccountId: accountA,
            toAccountId: accountA,
            amount: '1.00',
            description: 'expected failure in smoke',
            idempotencyKey: 'frontend-smoke-self-transfer',
          },
        },
      },
      {
        file: 'UpdateAccountMutation.ts',
        variables: {
          input: {
            id: accountA,
            ownerName: 'Alice Updated by Frontend Query',
            document: '52998224725',
          },
        },
      },
    ];

    for (const fixture of operationFixtures) {
      const query = loadOperation(fixture.file);
      const result = await gql(context.requester, query, fixture.variables);

      if (fixture.file === 'TransferFundsMutation.ts') {
        expect(result.errors[0].extensions.code).toBe('VALIDATION_ERROR');
        continue;
      }

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
    }
  });
});
