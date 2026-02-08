import { describe, expect, it } from 'vitest'
import { validateTransferForm } from '@/lib/validation/transfer'

describe('validateTransferForm', () => {
  it('validates and normalizes valid transfer input', () => {
    const result = validateTransferForm({
      fromAccountId: ' from ',
      toAccountId: ' to ',
      amount: '10.50',
      description: '  lunch ',
    })

    expect(result.errors).toEqual({})
    expect(result.values).toEqual({
      fromAccountId: 'from',
      toAccountId: 'to',
      amount: '10.50',
      description: 'lunch',
    })
  })

  it('returns validation errors for invalid transfer input', () => {
    const result = validateTransferForm({
      fromAccountId: '',
      toAccountId: '',
      amount: '-1.001',
      description: 'x'.repeat(141),
    })

    expect(result.errors.fromAccountId).toBeDefined()
    expect(result.errors.toAccountId).toBeDefined()
    expect(result.errors.amount).toBeDefined()
    expect(result.errors.description).toBeDefined()
  })

  it('rejects same source and destination account', () => {
    const result = validateTransferForm({
      fromAccountId: 'acc-1',
      toAccountId: 'acc-1',
      amount: '1.00',
      description: '',
    })

    expect(result.errors.toAccountId).toContain('must be different')
  })
})
