import Decimal from 'decimal.js';
import { Decimal128 } from 'mongodb';
import { decimalToDate, decimalToDecimal128, decimalToString, toDecimal } from '../../src/shared/utils/decimal';

describe('decimal utils', () => {
  it('converts supported numeric input types to Decimal', () => {
    expect(toDecimal(new Decimal('1.23')).toFixed(2)).toBe('1.23');
    expect(toDecimal(Decimal128.fromString('2.34')).toFixed(2)).toBe('2.34');
    expect(toDecimal('3.45').toFixed(2)).toBe('3.45');
    expect(toDecimal(4.56).toFixed(2)).toBe('4.56');
  });

  it('throws for unsupported values', () => {
    expect(() => toDecimal({})).toThrow('Invalid decimal value');
  });

  it('serializes decimals and converts to Decimal128', () => {
    expect(decimalToString('7')).toBe('7.00');
    expect(decimalToDecimal128('8.9').toString()).toBe('8.90');
  });

  it('normalizes Date-like values', () => {
    const now = new Date();
    expect(decimalToDate(now)).toBe(now);
    const iso = '2025-01-01T00:00:00.000Z';
    expect(decimalToDate(iso).toISOString()).toBe(iso);
  });
});
