import { encodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { queryResolvers } from '../../src/graphql/resolvers/queryResolvers';
import type { GraphQLContext } from '../../src/graphql/context';

function buildContext(): GraphQLContext {
  return {
    services: {
      accountService: {
        getByGlobalId: jest.fn().mockResolvedValue('account'),
        listAccounts: jest.fn().mockResolvedValue('accounts'),
        findById: jest.fn().mockResolvedValue({ _id: { toHexString: () => 'abc' } }),
        toView: jest.fn().mockReturnValue({ id: 'account-view' }),
      },
      balanceService: {
        availableBalance: jest.fn().mockResolvedValue('100.00'),
      },
      transactionService: {
        getTransactionByGlobalId: jest.fn().mockResolvedValue('tx'),
        listTransactionsByAccount: jest.fn().mockResolvedValue('tx-connection'),
        listRecentTransactions: jest.fn().mockResolvedValue('recent'),
      },
    },
  } as unknown as GraphQLContext;
}

describe('queryResolvers', () => {
  it('forwards account and accounts queries', async () => {
    const context = buildContext();

    await queryResolvers.account(undefined, { id: 'id-1' }, context);
    expect(context.services.accountService.getByGlobalId).toHaveBeenCalledWith('id-1');
    await queryResolvers.account(undefined, {}, context);
    expect(context.services.accountService.getByGlobalId).toHaveBeenLastCalledWith('');

    await queryResolvers.accounts(undefined, { first: 10, after: 'cursor', status: 'ACTIVE' }, context);
    expect(context.services.accountService.listAccounts).toHaveBeenCalledWith(10, 'cursor', 'ACTIVE');
  });

  it('resolves node/account/transaction list and balance with defaults', async () => {
    const context = buildContext();

    const accountNodeId = encodeGlobalId('Account', '507f1f77bcf86cd799439011');
    const transactionNodeId = encodeGlobalId('Transaction', '507f1f77bcf86cd799439012');

    const accountNode = await queryResolvers.node(undefined, { id: accountNodeId }, context);
    expect(accountNode).toEqual({ id: 'account-view' });

    const txNode = await queryResolvers.node(undefined, { id: transactionNodeId }, context);
    expect(txNode).toBe('tx');

    await queryResolvers.transaction(undefined, {}, context);
    expect(context.services.transactionService.getTransactionByGlobalId).toHaveBeenCalledWith('');

    await queryResolvers.transactionsByAccount(undefined, { accountId: 'a', first: 5 }, context);
    expect(context.services.transactionService.listTransactionsByAccount).toHaveBeenCalledWith('a', 'SENT', 5, undefined);
    await queryResolvers.transactionsByAccount(undefined, {}, context);
    expect(context.services.transactionService.listTransactionsByAccount).toHaveBeenLastCalledWith('', 'SENT', undefined, undefined);

    await queryResolvers.recentTransactions(undefined, {}, context);
    expect(context.services.transactionService.listRecentTransactions).toHaveBeenCalledWith([], undefined);

    await queryResolvers.availableBalance(undefined, { accountId: 'a1' }, context);
    expect(context.services.balanceService.availableBalance).toHaveBeenCalledWith('a1');
    await queryResolvers.availableBalance(undefined, {}, context);
    expect(context.services.balanceService.availableBalance).toHaveBeenLastCalledWith('');
  });
});
