import { normalizeAndValidateBrazilDocument } from '../../src/shared/validators/documentValidator';

describe('documentValidator', () => {
  it('normalizes valid CPF and CNPJ', () => {
    expect(normalizeAndValidateBrazilDocument('529.982.247-25')).toBe('52998224725');
    expect(normalizeAndValidateBrazilDocument('45.723.174/0001-10')).toBe('45723174000110');
  });

  it('rejects invalid document', () => {
    expect(() => normalizeAndValidateBrazilDocument('')).toThrow('Document is required');
    expect(() => normalizeAndValidateBrazilDocument('123')).toThrow('valid CPF or CNPJ');
    expect(() => normalizeAndValidateBrazilDocument('00000000000')).toThrow('valid CPF or CNPJ');
    expect(() => normalizeAndValidateBrazilDocument('00.000.000/0000-00')).toThrow('valid CPF or CNPJ');
  });
});
