import Decimal from 'decimal.js';
import { Kind, type ValueNode, GraphQLScalarType } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';

function toDecimalInputString(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError('BigDecimal value must be a string or number');
  }

  const raw = String(value);
  // Parse using decimal.js to reject invalid numeric inputs while preserving scale for domain validation.
  new Decimal(raw);
  return raw;
}

function toDecimalOutputString(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new TypeError('BigDecimal value must be a string or number');
  }

  return new Decimal(String(value)).toFixed(2);
}

function parseLiteral(ast: ValueNode): string {
  if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
    return toDecimalInputString(ast.value);
  }

  throw new TypeError('BigDecimal literal must be string, int or float');
}

export const GraphQLBigDecimal = new GraphQLScalarType({
  name: 'BigDecimal',
  description: 'Arbitrary-precision decimal represented as a string',
  serialize: toDecimalOutputString,
  parseValue: toDecimalInputString,
  parseLiteral,
});

export const GraphQLDateTime = DateTimeResolver;
