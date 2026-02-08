import { startIntegrationApp, stopIntegrationApp, clearDatabase, type IntegrationAppContext } from './testApp';
import type { TransferFundsPayload } from '../../src/modules/transaction/transactionService';
import { getMongoDb } from '../../src/config/mongo';
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

describe('Idempotency concurrency integration', () => {
  it('keeps one fresh execution under concurrent retries', async () => {
    const fromAccountId = await createAccount(context.requester, 'Alice', '52998224725', '0001', '11111-1', '1000.00');
    const toAccountId = await createAccount(context.requester, 'Bob', '02306078106', '0001', '22222-2', '1000.00');

    const promises = Array.from({ length: 8 }).map(() =>
      context.app.services.transactionService.transferFunds(
        fromAccountId,
        toAccountId,
        '10.00',
        'parallel retry',
        'idem-concurrent-1',
      ),
    );

    const outcomes = await Promise.allSettled(promises);

    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<TransferFundsPayload> => outcome.status === 'fulfilled',
    );
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
    );

    const freshExecutions = fulfilled.filter((outcome) => !outcome.value.idempotentReplay).length;
    const replays = fulfilled.filter((outcome) => outcome.value.idempotentReplay).length;
    const conflicts = rejected.filter((outcome) => {
      const error = outcome.reason as { code?: string };
      return error?.code === 'CONFLICT';
    }).length;

    expect(freshExecutions).toBe(1);
    expect(replays + conflicts).toBe(7);

    const txCount = await getMongoDb().collection('transactions').countDocuments();
    const idemCount = await getMongoDb().collection('idempotency_records').countDocuments();

    expect(txCount).toBe(1);
    expect(idemCount).toBe(1);
  });
});
