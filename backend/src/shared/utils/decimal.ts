import Decimal from 'decimal.js';
import { Decimal128 } from 'mongodb';

export function toDecimal(value: unknown): Decimal {
  if (value instanceof Decimal) {
    return value;
  }

  if (value instanceof Decimal128) {
    return new Decimal(value.toString());
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Decimal(value);
  }

  throw new Error('Invalid decimal value');
}

export function decimalToString(value: unknown): string {
  return toDecimal(value).toFixed(2);
}

export function decimalToDecimal128(value: unknown): Decimal128 {
  const decimal = toDecimal(value);
  return Decimal128.fromString(decimal.toFixed(2));
}

export function decimalToDate(value: Date | string): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}
