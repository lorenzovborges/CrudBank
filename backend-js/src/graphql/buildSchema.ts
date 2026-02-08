import fs from 'fs';
import path from 'path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { queryResolvers } from './resolvers/queryResolvers';
import { mutationResolvers } from './resolvers/mutationResolvers';
import { GraphQLBigDecimal, GraphQLDateTime } from './scalars';

function loadSchemaSDL(): string {
  const schemaPath = path.resolve(process.cwd(), 'src/graphql/schema.graphqls');
  return fs.readFileSync(schemaPath, 'utf8');
}

export function buildExecutableSchema() {
  const typeDefs = loadSchemaSDL();

  return makeExecutableSchema({
    typeDefs,
    resolvers: {
      DateTime: GraphQLDateTime,
      BigDecimal: GraphQLBigDecimal,
      Query: queryResolvers,
      Mutation: mutationResolvers,
      Node: {
        __resolveType(obj: { __typename?: string }) {
          if (obj.__typename === 'Account') {
            return 'Account';
          }
          if (obj.__typename === 'Transaction') {
            return 'Transaction';
          }
          return null;
        },
      },
    },
  });
}
