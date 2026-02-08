import { describe, expect, it } from 'vitest'
import { validateAccountForm } from '@/lib/validation/account'

describe('validateAccountForm', () => {
  it('normalizes and validates a valid account form', () => {
    const result = validateAccountForm({
      ownerName: '  Alice   Silva ',
      document: '529.982.247-25',
      branch: '00-01',
      number: ' 12345-6 ',
      initialBalance: '1000.50',
    })

    expect(result.errors).toEqual({})
    expect(result.values).toEqual({
      ownerName: 'Alice Silva',
      document: '52998224725',
      branch: '0001',
      number: '12345-6',
      initialBalance: '1000.50',
    })
  })

  it('returns field errors for invalid values', () => {
    const result = validateAccountForm({
      ownerName: 'Al',
      document: '123',
      branch: '12',
      number: 'abc',
      initialBalance: '-10.001',
    })

    expect(result.errors.ownerName).toBeDefined()
    expect(result.errors.document).toBeDefined()
    expect(result.errors.branch).toBeDefined()
    expect(result.errors.number).toBeDefined()
    expect(result.errors.initialBalance).toBeDefined()
  })
})
