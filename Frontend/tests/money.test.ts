import { describe, expect, it } from 'vitest'
import { compareCents, formatCents, sumCents, toCents, tryToCents } from '@/lib/money'

describe('money helpers', () => {
  it('converts string and number values to cents', () => {
    expect(toCents('10.50')).toBe(1050)
    expect(toCents('10,50')).toBe(1050)
    expect(toCents(10.5)).toBe(1050)
  })

  it('sums and compares values in cents', () => {
    expect(sumCents(['1.00', '2.35', 3])).toBe(635)
    expect(compareCents('5.00', '4.99')).toBe(1)
    expect(compareCents('5.00', '5.00')).toBe(0)
    expect(compareCents('4.99', '5.00')).toBe(-1)
  })

  it('handles invalid values predictably', () => {
    expect(tryToCents('invalid')).toBeNull()
    expect(() => toCents('invalid')).toThrow('Invalid money value')
  })

  it('formats cents as BRL currency', () => {
    expect(formatCents(1234)).toContain('12')
  })
})
