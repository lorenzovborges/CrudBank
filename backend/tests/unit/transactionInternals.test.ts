import { transactionInternals } from '../../src/modules/transaction/transactionService';

describe('transaction internals', () => {
  it('evaluates text helper', () => {
    expect(transactionInternals.hasText('x')).toBe(true);
    expect(transactionInternals.hasText('   ')).toBe(false);
    expect(transactionInternals.hasText(undefined)).toBe(false);
  });

  it('resolves recent transaction type relative to account set', () => {
    const accountIds = new Set(['A', 'B']);

    expect(
      transactionInternals.resolveRecentType({ fromAccountId: 'A', toAccountId: 'B' } as never, accountIds),
    ).toBe('TRANSFER');
    expect(
      transactionInternals.resolveRecentType({ fromAccountId: 'X', toAccountId: 'B' } as never, accountIds),
    ).toBe('RECEIVED');
    expect(
      transactionInternals.resolveRecentType({ fromAccountId: 'A', toAccountId: 'X' } as never, accountIds),
    ).toBe('SENT');
  });

  it('evaluates completed and pending states for idempotency records', () => {
    expect(
      transactionInternals.isCompleted({ status: 'COMPLETED', responsePayload: undefined } as never),
    ).toBe(true);
    expect(
      transactionInternals.isCompleted({ status: undefined, responsePayload: '{"ok":true}' } as never),
    ).toBe(true);
    expect(transactionInternals.isCompleted({ status: undefined, responsePayload: '' } as never)).toBe(false);

    expect(transactionInternals.isPending({ status: 'PENDING', responsePayload: undefined } as never)).toBe(true);
    expect(transactionInternals.isPending({ status: undefined, responsePayload: '' } as never)).toBe(true);
    expect(
      transactionInternals.isPending({ status: undefined, responsePayload: '{"ok":true}' } as never),
    ).toBe(false);
  });

  it('evaluates Mongo error code helpers', () => {
    expect(transactionInternals.isDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(transactionInternals.isDuplicateKeyError({ code: 1 })).toBe(false);
    expect(transactionInternals.isDuplicateKeyError('x')).toBe(false);

    expect(transactionInternals.isDataIntegrityError({ code: 11000 })).toBe(true);
    expect(transactionInternals.isDataIntegrityError({ code: 112 })).toBe(true);
    expect(transactionInternals.isDataIntegrityError({ code: 251 })).toBe(true);
    expect(transactionInternals.isDataIntegrityError({ code: 999 })).toBe(false);
    expect(transactionInternals.isDataIntegrityError('x')).toBe(false);
  });

  it('sleeps asynchronously', async () => {
    const started = Date.now();
    await transactionInternals.sleep(10);
    expect(Date.now() - started).toBeGreaterThanOrEqual(5);
  });
});
