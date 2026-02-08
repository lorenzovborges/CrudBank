import { mutationResolvers } from '../../src/graphql/resolvers/mutationResolvers';
import type { GraphQLContext } from '../../src/graphql/context';

function buildContext(): GraphQLContext {
  return {
    services: {
      accountService: {
        createAccount: jest.fn().mockResolvedValue('created'),
        updateAccount: jest.fn().mockResolvedValue('updated'),
        deactivateAccount: jest.fn().mockResolvedValue('deactivated'),
      },
      balanceService: {
        availableBalance: jest.fn(),
      },
      transactionService: {
        transferFunds: jest.fn().mockResolvedValue('transferred'),
      },
    },
  } as unknown as GraphQLContext;
}

describe('mutationResolvers', () => {
  it('forwards createAccount arguments with safe defaults', async () => {
    const context = buildContext();
    const created = await mutationResolvers.createAccount(
      undefined,
      { input: { ownerName: 'A', document: 'B', branch: 'C', number: 'D', initialBalance: '10.00' } },
      context,
    );

    expect(created).toBe('created');
    expect(context.services.accountService.createAccount).toHaveBeenCalledWith('A', 'B', 'C', 'D', '10.00');

    await mutationResolvers.createAccount(undefined, {}, context);
    expect(context.services.accountService.createAccount).toHaveBeenLastCalledWith('', '', '', '', undefined);
  });

  it('forwards update/deactivate/transfer with defaults', async () => {
    const context = buildContext();

    await mutationResolvers.updateAccount(undefined, { input: { id: '1', ownerName: 'N', document: 'D' } }, context);
    expect(context.services.accountService.updateAccount).toHaveBeenCalledWith('1', 'N', 'D');

    await mutationResolvers.updateAccount(undefined, {}, context);
    expect(context.services.accountService.updateAccount).toHaveBeenLastCalledWith('', undefined, undefined);

    await mutationResolvers.deactivateAccount(undefined, { input: { id: '2' } }, context);
    expect(context.services.accountService.deactivateAccount).toHaveBeenCalledWith('2');
    await mutationResolvers.deactivateAccount(undefined, {}, context);
    expect(context.services.accountService.deactivateAccount).toHaveBeenLastCalledWith('');

    await mutationResolvers.transferFunds(
      undefined,
      { input: { fromAccountId: 'A', toAccountId: 'B', amount: '1.00', description: 'x', idempotencyKey: 'k' } },
      context,
    );
    expect(context.services.transactionService.transferFunds).toHaveBeenCalledWith('A', 'B', '1.00', 'x', 'k');

    await mutationResolvers.transferFunds(undefined, {}, context);
    expect(context.services.transactionService.transferFunds).toHaveBeenLastCalledWith('', '', undefined, undefined, '');
  });
});
