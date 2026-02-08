import { GraphQLError, type GraphQLErrorExtensions } from 'graphql';
import { DomainError } from './DomainError';

export function formatGraphQLError(
  error: Readonly<GraphQLError | Error>,
): GraphQLError | Error {
  const graphQLError = error instanceof GraphQLError ? error : null;
  const originalError = graphQLError?.originalError;

  if (originalError instanceof DomainError) {
    return new GraphQLError(originalError.message, {
      nodes: graphQLError?.nodes,
      source: graphQLError?.source,
      positions: graphQLError?.positions,
      path: graphQLError?.path,
      extensions: {
        code: originalError.code,
        ...originalError.details,
      },
    });
  }

  if (graphQLError?.extensions?.code === 'GRAPHQL_VALIDATION_FAILED') {
    return new GraphQLError(graphQLError.message, {
      nodes: graphQLError.nodes,
      source: graphQLError.source,
      positions: graphQLError.positions,
      path: graphQLError.path,
      extensions: {
        code: 'BAD_REQUEST',
      },
    });
  }

  if (graphQLError?.extensions?.code === 'GRAPHQL_PARSE_FAILED') {
    return new GraphQLError(graphQLError.message, {
      nodes: graphQLError.nodes,
      source: graphQLError.source,
      positions: graphQLError.positions,
      path: graphQLError.path,
      extensions: {
        code: 'BAD_REQUEST',
      },
    });
  }

  if (graphQLError && graphQLError.message.startsWith('Syntax Error')) {
    return new GraphQLError(graphQLError.message, {
      nodes: graphQLError.nodes,
      source: graphQLError.source,
      positions: graphQLError.positions,
      path: graphQLError.path,
      extensions: {
        code: 'BAD_REQUEST',
      },
    });
  }

  if (graphQLError?.extensions?.code) {
    return graphQLError;
  }

  const extensions: GraphQLErrorExtensions = { code: 'INTERNAL_ERROR' };
  return new GraphQLError('Unexpected error', {
    nodes: graphQLError?.nodes,
    source: graphQLError?.source,
    positions: graphQLError?.positions,
    path: graphQLError?.path,
    extensions,
  });
}
