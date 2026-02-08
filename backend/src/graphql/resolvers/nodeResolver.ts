import { DomainError } from '../../shared/errors/DomainError';
import { decodeGlobalId } from '../../shared/relay/globalIdCodec';
import type { GraphQLContext } from '../context';

export async function resolveNodeByGlobalId(id: string, context: GraphQLContext): Promise<unknown> {
  const decoded = decodeGlobalId(id);

  if (decoded.type === 'Account') {
    const account = await context.services.accountService.findById(decoded.id);
    return context.services.accountService.toView(account);
  }

  if (decoded.type === 'Transaction') {
    return context.services.transactionService.getTransactionByGlobalId(id);
  }

  throw DomainError.notFound('Node not found');
}
