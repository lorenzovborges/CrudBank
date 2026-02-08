import type { GraphQLContext } from '../context';

interface MutationArgs {
  input?: {
    ownerName?: string;
    document?: string;
    branch?: string;
    number?: string;
    initialBalance?: unknown;
    id?: string;
    fromAccountId?: string;
    toAccountId?: string;
    amount?: unknown;
    description?: string | null;
    idempotencyKey?: string;
  };
}

export const mutationResolvers = {
  createAccount: async (_: unknown, args: MutationArgs, context: GraphQLContext) => {
    const input = args.input ?? {};
    return context.services.accountService.createAccount(
      input.ownerName ?? '',
      input.document ?? '',
      input.branch ?? '',
      input.number ?? '',
      input.initialBalance,
    );
  },

  updateAccount: async (_: unknown, args: MutationArgs, context: GraphQLContext) => {
    const input = args.input ?? {};
    return context.services.accountService.updateAccount(
      input.id ?? '',
      input.ownerName,
      input.document,
    );
  },

  deactivateAccount: async (_: unknown, args: MutationArgs, context: GraphQLContext) => {
    const input = args.input ?? {};
    return context.services.accountService.deactivateAccount(input.id ?? '');
  },

  transferFunds: async (_: unknown, args: MutationArgs, context: GraphQLContext) => {
    const input = args.input ?? {};
    return context.services.transactionService.transferFunds(
      input.fromAccountId ?? '',
      input.toAccountId ?? '',
      input.amount,
      input.description,
      input.idempotencyKey ?? '',
    );
  },
};
