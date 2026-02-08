import type { GraphQLContext } from '../context';
import { resolveNodeByGlobalId } from './nodeResolver';

interface QueryArgs {
  id?: string;
  first?: number;
  after?: string | null;
  status?: string | null;
  accountId?: string;
  direction?: 'SENT' | 'RECEIVED';
  accountIds?: string[];
}

export const queryResolvers = {
  node: async (_: unknown, args: QueryArgs, context: GraphQLContext): Promise<unknown> => {
    return resolveNodeByGlobalId(args.id ?? '', context);
  },

  account: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.accountService.getByGlobalId(args.id ?? '');
  },

  accounts: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.accountService.listAccounts(
      args.first,
      args.after,
      args.status,
    );
  },

  transaction: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.transactionService.getTransactionByGlobalId(args.id ?? '');
  },

  transactionsByAccount: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.transactionService.listTransactionsByAccount(
      args.accountId ?? '',
      args.direction ?? 'SENT',
      args.first,
      args.after,
    );
  },

  recentTransactions: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.transactionService.listRecentTransactions(
      args.accountIds ?? [],
      args.first,
    );
  },

  availableBalance: async (_: unknown, args: QueryArgs, context: GraphQLContext) => {
    return context.services.balanceService.availableBalance(args.accountId ?? '');
  },
};
