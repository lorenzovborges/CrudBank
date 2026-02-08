import { GraphQLError } from 'graphql';
import { DomainError } from '../../src/shared/errors/DomainError';
import { formatGraphQLError } from '../../src/shared/errors/graphqlErrorFormatter';

describe('formatGraphQLError', () => {
  it('formats DomainError with code and details', () => {
    const original = DomainError.validationField('amount', 'Amount is required');
    const gql = new GraphQLError('wrapper', { originalError: original, path: ['transferFunds'] });

    const formatted = formatGraphQLError(gql) as GraphQLError;

    expect(formatted.message).toBe('Amount is required');
    expect(formatted.extensions?.code).toBe('VALIDATION_ERROR');
    expect(formatted.extensions?.violations).toEqual([{ field: 'amount', message: 'Amount is required' }]);
  });

  it('maps GraphQL validation/parse failures to BAD_REQUEST', () => {
    const validationError = new GraphQLError('bad query', {
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    });

    const parseError = new GraphQLError('bad payload', {
      extensions: { code: 'GRAPHQL_PARSE_FAILED' },
    });

    const formattedValidation = formatGraphQLError(validationError) as GraphQLError;
    const formattedParse = formatGraphQLError(parseError) as GraphQLError;
    const syntaxOnly = formatGraphQLError(new GraphQLError('Syntax Error: Unexpected <EOF>')) as GraphQLError;

    expect(formattedValidation.extensions?.code).toBe('BAD_REQUEST');
    expect(formattedParse.extensions?.code).toBe('BAD_REQUEST');
    expect(syntaxOnly.extensions?.code).toBe('BAD_REQUEST');
  });

  it('keeps explicit extension codes and uses INTERNAL_ERROR for unknown errors', () => {
    const explicit = new GraphQLError('already-mapped', { extensions: { code: 'NOT_FOUND' } });
    const kept = formatGraphQLError(explicit) as GraphQLError;
    expect(kept).toBe(explicit);

    const unknown = formatGraphQLError(new Error('boom')) as GraphQLError;
    expect(unknown.message).toBe('Unexpected error');
    expect(unknown.extensions?.code).toBe('INTERNAL_ERROR');
  });
});
