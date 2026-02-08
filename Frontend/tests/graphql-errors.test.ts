import { describe, expect, it } from 'vitest'
import { parseGraphqlError, violationsToFieldErrors } from '@/lib/errors/graphql'

describe('parseGraphqlError', () => {
  it('parses graphql code and violations from response.errors', () => {
    const parsed = parseGraphqlError({
      response: {
        errors: [
          {
            message: 'Validation failed',
            extensions: {
              code: 'VALIDATION_ERROR',
              violations: [
                { field: 'amount', message: 'Amount must be greater than zero' },
              ],
            },
          },
        ],
      },
    })

    expect(parsed.code).toBe('VALIDATION_ERROR')
    expect(parsed.userMessage).toBe('Please review the highlighted fields.')
    expect(parsed.violations).toEqual([
      { field: 'amount', message: 'Amount must be greater than zero' },
    ])
  })

  it('falls back to default message for unknown errors', () => {
    const parsed = parseGraphqlError(new Error('Network down'))

    expect(parsed.code).toBeUndefined()
    expect(parsed.message).toBe('Network down')
    expect(parsed.userMessage).toBe('We could not complete your request.')
    expect(parsed.violations).toEqual([])
  })

  it('converts violations to field-error map', () => {
    const errors = violationsToFieldErrors([
      { field: 'amount', message: 'Invalid amount' },
      { field: 'amount', message: 'Duplicated should be ignored' },
      { field: 'toAccountId', message: 'Destination required' },
    ])

    expect(errors).toEqual({
      amount: 'Invalid amount',
      toAccountId: 'Destination required',
    })
  })
})
