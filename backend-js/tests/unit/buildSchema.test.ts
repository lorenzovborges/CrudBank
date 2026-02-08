import type { GraphQLInterfaceType } from 'graphql';
import { buildExecutableSchema } from '../../src/graphql/buildSchema';

describe('buildExecutableSchema', () => {
  it('loads schema and resolves Node concrete types', async () => {
    const schema = buildExecutableSchema();

    const nodeType = schema.getType('Node') as GraphQLInterfaceType;
    expect(nodeType).toBeDefined();

    const resolveType = nodeType.resolveType;
    expect(resolveType).toBeDefined();

    expect(await resolveType?.({ __typename: 'Account' }, {}, undefined as never, undefined as never)).toBe('Account');
    expect(await resolveType?.({ __typename: 'Transaction' }, {}, undefined as never, undefined as never)).toBe('Transaction');
    expect(await resolveType?.({ __typename: 'Other' }, {}, undefined as never, undefined as never)).toBeNull();
  });
});
