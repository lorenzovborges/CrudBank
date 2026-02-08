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

describe('Bank flow integration', () => {
  it('transfers funds and returns updated balances', async () => {
    const accountA = await createAccount(context.requester, 'Alice', '52998224725', '0001', '11111-1', '1000.00');
    const accountB = await createAccount(context.requester, 'Bob', '02306078106', '0001', '22222-2', '500.00');

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) {
          transaction { id amount fromAccountId toAccountId }
          fromAccountBalance
          toAccountBalance
          idempotentReplay
        }
      }
    `;

    const transfer = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '100.00',
        description: 'Lunch',
        idempotencyKey: 'idem-flow-1',
      },
    });

    expect(transfer.data.transferFunds.fromAccountBalance).toBe('900.00');
    expect(transfer.data.transferFunds.toAccountBalance).toBe('600.00');
    expect(transfer.data.transferFunds.idempotentReplay).toBe(false);

    const balanceQuery = `
      query Balance($id: ID!) {
        availableBalance(accountId: $id)
      }
    `;

    const balanceA = await gql(context.requester, balanceQuery, { id: accountA });
    const balanceB = await gql(context.requester, balanceQuery, { id: accountB });

    expect(balanceA.data.availableBalance).toBe('900.00');
    expect(balanceB.data.availableBalance).toBe('600.00');
  });

  it('replays idempotent transfer and keeps same transaction id', async () => {
    const accountA = await createAccount(context.requester, 'Alice', '52998224725', '0001', '33333-3', '1000.00');
    const accountB = await createAccount(context.requester, 'Bob', '02306078106', '0001', '44444-4', '500.00');

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) {
          transaction { id }
          idempotentReplay
          fromAccountBalance
          toAccountBalance
        }
      }
    `;

    const first = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '150.00',
        description: 'Dinner',
        idempotencyKey: 'idem-flow-2',
      },
    });

    const second = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '150.00',
        description: 'Dinner',
        idempotencyKey: 'idem-flow-2',
      },
    });

    expect(second.data.transferFunds.transaction.id).toBe(first.data.transferFunds.transaction.id);
    expect(second.data.transferFunds.idempotentReplay).toBe(true);
    expect(second.data.transferFunds.fromAccountBalance).toBe('850.00');
    expect(second.data.transferFunds.toAccountBalance).toBe('650.00');
  });

  it('supports relay pagination, node, transactionsByAccount and recentTransactions', async () => {
    await createAccount(context.requester, 'A1 Name', '52998224725', '0001', '10101-1', '100.00');
    await createAccount(context.requester, 'A2 Name', '02306078106', '0001', '20202-2', '100.00');
    const account3 = await createAccount(context.requester, 'A3 Name', '11144477735', '0001', '30303-3', '100.00');

    const accountsQuery = `
      query Accounts($first: Int!, $after: String) {
        accounts(first: $first, after: $after) {
          edges { cursor node { id ownerName } }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;

    const firstPage = await gql(context.requester, accountsQuery, { first: 2, after: null });
    expect(firstPage.data.accounts.pageInfo.hasNextPage).toBe(true);

    const secondPage = await gql(context.requester, accountsQuery, {
      first: 2,
      after: firstPage.data.accounts.pageInfo.endCursor,
    });
    expect(secondPage.data.accounts.edges[0].node.ownerName).toBe('A1 Name');

    const nodeQuery = `
      query Node($id: ID!) {
        node(id: $id) {
          id
          ... on Account { ownerName }
        }
      }
    `;

    const node = await gql(context.requester, nodeQuery, { id: account3 });
    expect(node.data.node.id).toBe(account3);
    expect(node.data.node.ownerName).toBe('A3 Name');

    const accountA = await createAccount(context.requester, 'Alice', '39053344705', '0001', '12121-1', '1000.00');
    const accountB = await createAccount(context.requester, 'Bob', '98765432100', '0001', '34343-3', '1000.00');

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) { transaction { id } }
      }
    `;

    await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '10.00',
        description: 'T1',
        idempotencyKey: 'idem-flow-7',
      },
    });

    const txQuery = `
      query Tx($accountId: ID!, $direction: TransactionDirection!, $first: Int!) {
        transactionsByAccount(accountId: $accountId, direction: $direction, first: $first) {
          edges { node { fromAccountId toAccountId amount } }
        }
      }
    `;

    const sent = await gql(context.requester, txQuery, {
      accountId: accountA,
      direction: 'SENT',
      first: 10,
    });
    expect(sent.data.transactionsByAccount.edges[0].node.fromAccountId).toBe(accountA);
    expect(sent.data.transactionsByAccount.edges[0].node.toAccountId).toBe(accountB);

    const received = await gql(context.requester, txQuery, {
      accountId: accountB,
      direction: 'RECEIVED',
      first: 10,
    });
    expect(received.data.transactionsByAccount.edges[0].node.fromAccountId).toBe(accountA);
    expect(received.data.transactionsByAccount.edges[0].node.toAccountId).toBe(accountB);

    const recentQuery = `
      query Recent($accountIds: [ID!]!, $first: Int!) {
        recentTransactions(accountIds: $accountIds, first: $first) {
          type
          transaction { fromAccountId toAccountId }
        }
      }
    `;

    const recent = await gql(context.requester, recentQuery, {
      accountIds: [accountA, accountB],
      first: 10,
    });

    expect(recent.data.recentTransactions[0].type).toBe('TRANSFER');
    expect(recent.data.recentTransactions[0].transaction.fromAccountId).toBe(accountA);
    expect(recent.data.recentTransactions[0].transaction.toAccountId).toBe(accountB);
  });

  it('returns expected domain error codes', async () => {
    const accountA = await createAccount(context.requester, 'Alice', '52998224725', '0001', '77777-7', '50.00');
    const accountB = await createAccount(context.requester, 'Bob', '02306078106', '0001', '88888-8', '10.00');

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) { transaction { id } }
      }
    `;

    const insufficientFunds = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '70.00',
        description: 'Too much',
        idempotencyKey: 'idem-flow-8',
      },
    });

    expect(insufficientFunds.errors[0].extensions.code).toBe('INSUFFICIENT_FUNDS');

    const deactivateMutation = `
      mutation Deactivate($input: DeactivateAccountInput!) {
        deactivateAccount(input: $input) { id status }
      }
    `;

    await gql(context.requester, deactivateMutation, { input: { id: accountB } });

    const inactive = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '10.00',
        description: 'Should fail',
        idempotencyKey: 'idem-flow-9',
      },
    });

    expect(inactive.errors[0].extensions.code).toBe('ACCOUNT_INACTIVE');
  });
});
