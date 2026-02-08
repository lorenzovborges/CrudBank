import { Kind, type ValueNode } from 'graphql';
import { GraphQLBigDecimal } from '../../src/graphql/scalars';

describe('GraphQLBigDecimal', () => {
  it('preserves input scale for parseValue so domain validation can reject invalid precision', () => {
    expect(GraphQLBigDecimal.parseValue('1.001')).toBe('1.001');
    expect(GraphQLBigDecimal.parseValue(2.5)).toBe('2.5');
  });

  it('serializes output with 2 decimal places', () => {
    expect(GraphQLBigDecimal.serialize('10')).toBe('10.00');
    expect(GraphQLBigDecimal.serialize(10.4)).toBe('10.40');
  });

  it('parses literals for supported kinds and rejects unsupported kind', () => {
    const floatLiteral: ValueNode = { kind: Kind.FLOAT, value: '3.1415' };
    const intLiteral: ValueNode = { kind: Kind.INT, value: '5' };
    const stringLiteral: ValueNode = { kind: Kind.STRING, value: '8.00' };

    expect(GraphQLBigDecimal.parseLiteral(floatLiteral, {})).toBe('3.1415');
    expect(GraphQLBigDecimal.parseLiteral(intLiteral, {})).toBe('5');
    expect(GraphQLBigDecimal.parseLiteral(stringLiteral, {})).toBe('8.00');

    const invalid = { kind: Kind.BOOLEAN, value: true } as unknown as ValueNode;
    expect(() => GraphQLBigDecimal.parseLiteral(invalid, {})).toThrow('BigDecimal literal');
  });

  it('rejects invalid parseValue inputs', () => {
    expect(() => GraphQLBigDecimal.parseValue({})).toThrow('BigDecimal value must be a string or number');
    expect(() => GraphQLBigDecimal.parseValue('not-a-number')).toThrow();
  });
});
