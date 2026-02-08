import { describe, expect, it } from 'vitest'
import { isValidBrazilDocument, normalizeDocument } from '@/lib/validation/document'

describe('document validation helpers', () => {
  it('normalizes documents by keeping only digits', () => {
    expect(normalizeDocument('529.982.247-25')).toBe('52998224725')
  })

  it('accepts valid CPF and CNPJ', () => {
    expect(isValidBrazilDocument('529.982.247-25')).toBe(true)
    expect(isValidBrazilDocument('45.723.174/0001-10')).toBe(true)
  })

  it('rejects invalid documents', () => {
    expect(isValidBrazilDocument('111.111.111-11')).toBe(false)
    expect(isValidBrazilDocument('123')).toBe(false)
  })
})
