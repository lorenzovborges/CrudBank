import { DomainError } from '../../src/shared/errors/DomainError';
import { encodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { resolveNodeByGlobalId } from '../../src/graphql/resolvers/nodeResolver';
import type { GraphQLContext } from '../../src/graphql/context';

function buildContext(): GraphQLContext {
  return {
    services: {
      accountService: {
        findById: jest.fn().mockResolvedValue({ _id: { toHexString: () => 'abc' } }),
        toView: jest.fn().mockReturnValue({ id: 'account' }),
      },
      balanceService: {
        availableBalance: jest.fn(),
      },
      transactionService: {
        getTransactionByGlobalId: jest.fn().mockResolvedValue({ id: 'tx' }),
      },
    },
  } as unknown as GraphQLContext;
}

describe('nodeResolver', () => {
  it('resolves account and transaction nodes', async () => {
    const context = buildContext();

    const accountId = encodeGlobalId('Account', '507f1f77bcf86cd799439011');
    const txId = encodeGlobalId('Transaction', '507f1f77bcf86cd799439012');

    const account = await resolveNodeByGlobalId(accountId, context);
    const transaction = await resolveNodeByGlobalId(txId, context);

    expect(account).toEqual({ id: 'account' });
    expect(transaction).toEqual({ id: 'tx' });
  });

  it('returns NOT_FOUND for unknown node type', async () => {
    const context = buildContext();
    const unknownId = encodeGlobalId('Unknown', '507f1f77bcf86cd799439013');

    await expect(resolveNodeByGlobalId(unknownId, context)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'NOT_FOUND',
    });
  });
});
