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

describe('BigDecimal precision parity', () => {
  it('rejects >2 decimal places in createAccount and transferFunds', async () => {
    const createMutation = `
      mutation CreateAccount($input: CreateAccountInput!) {
        createAccount(input: $input) { id }
      }
    `;

    const createInvalid = await gql(context.requester, createMutation, {
      input: {
        ownerName: 'Scale Invalid',
        document: '52998224725',
        branch: '0001',
        number: '60001-1',
        initialBalance: '1.001',
      },
    });

    expect(createInvalid.errors[0].extensions.code).toBe('VALIDATION_ERROR');

    const accountA = await createAccount(context.requester, 'Scale A', '02306078106', '0001', '60001-2', '100.00');
    const accountB = await createAccount(context.requester, 'Scale B', '39053344705', '0001', '60001-3', '100.00');

    const transferMutation = `
      mutation Transfer($input: TransferFundsInput!) {
        transferFunds(input: $input) {
          transaction { id }
        }
      }
    `;

    const transferInvalid = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '1.001',
        description: 'too precise',
        idempotencyKey: 'precision-test-1',
      },
    });

    expect(transferInvalid.errors[0].extensions.code).toBe('VALIDATION_ERROR');

    const transferValid = await gql(context.requester, transferMutation, {
      input: {
        fromAccountId: accountA,
        toAccountId: accountB,
        amount: '1.00',
        description: 'valid',
        idempotencyKey: 'precision-test-2',
      },
    });

    expect(transferValid.errors).toBeUndefined();
  });
});
