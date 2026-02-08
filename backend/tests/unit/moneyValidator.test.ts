import { validateNonNegativeAmount, validatePositiveAmount } from '../../src/shared/validators/moneyValidator';

describe('moneyValidator', () => {
  it('accepts valid positive amount', () => {
    expect(validatePositiveAmount('10.50').toFixed(2)).toBe('10.50');
  });

  it('rejects null and invalid scale', () => {
    expect(() => validatePositiveAmount(null)).toThrow('Amount is required');
    expect(() => validatePositiveAmount({} as unknown as string)).toThrow('Amount is required');
    expect(() => validatePositiveAmount('1.001')).toThrow('at most 2 decimal places');
  });

  it('rejects zero and negatives for positive', () => {
    expect(() => validatePositiveAmount('0')).toThrow('greater than zero');
    expect(() => validatePositiveAmount('-1.00')).toThrow('greater than zero');
  });

  it('allows zero for non-negative and rejects negative', () => {
    expect(validateNonNegativeAmount('0').toFixed(2)).toBe('0.00');
    expect(() => validateNonNegativeAmount('-0.01')).toThrow('zero or greater');
  });
});
