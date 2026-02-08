import {
  normalizeAccountNumber,
  normalizeBranch,
  normalizeDocument,
  normalizeOwnerName,
} from '../../src/shared/validators/accountFieldNormalizer';

describe('accountFieldNormalizer', () => {
  it('normalizes valid values', () => {
    expect(normalizeOwnerName('  Alice   Silva ')).toBe('Alice Silva');
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeBranch('00-01')).toBe('0001');
    expect(normalizeAccountNumber(' 12345-6 ')).toBe('12345-6');
  });

  it('rejects invalid values', () => {
    expect(() => normalizeOwnerName('')).toThrow('Owner name is required');
    expect(() => normalizeOwnerName('Al')).toThrow('between 3 and 120');
    expect(() => normalizeBranch('')).toThrow('Branch is required');
    expect(() => normalizeBranch('12')).toThrow('exactly 4 digits');
    expect(() => normalizeAccountNumber('')).toThrow('Account number is required');
    expect(() => normalizeAccountNumber('abc')).toThrow('must match');
  });
});
