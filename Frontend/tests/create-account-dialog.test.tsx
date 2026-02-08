import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog'
import { validateAccountForm } from '@/lib/validation/account'

const commitMock = vi.fn()

vi.mock('react-relay', () => ({
  useMutation: vi.fn(() => [commitMock, false]),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/graphql/CreateAccountMutation', () => ({
  CreateAccountMutation: {},
}))

vi.mock('@/lib/validation/account', () => ({
  validateAccountForm: vi.fn(),
}))

vi.mock('@/lib/errors/graphql', () => ({
  parseGraphqlError: vi.fn((err) => ({
    userMessage: 'Something went wrong',
    violations: err?.response?.errors?.[0]?.extensions?.violations ?? [],
  })),
  violationsToFieldErrors: vi.fn((violations) => {
    const result: Record<string, string> = {}
    for (const v of violations) {
      result[v.field] = v.message
    }
    return result
  }),
}))

describe('CreateAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows validation errors and does not call mutation', async () => {
    vi.mocked(validateAccountForm).mockReturnValue({
      values: { ownerName: '', document: '', branch: '', number: '', initialBalance: '' },
      errors: { ownerName: 'Owner name is required.' },
    })

    render(<CreateAccountDialog open onOpenChange={vi.fn()} />)

    const form = screen.getByRole('button', { name: 'Create Account' }).closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Owner name is required.')).toBeInTheDocument()
    })
    expect(commitMock).not.toHaveBeenCalled()
  })

  it('calls mutation on successful validation', async () => {
    vi.mocked(validateAccountForm).mockReturnValue({
      values: { ownerName: 'John Doe', document: '12345678901', branch: '0001', number: '12345-6', initialBalance: '100.00' },
      errors: {},
    })

    commitMock.mockImplementation(({ onCompleted }) => {
      onCompleted?.()
    })

    const onSuccess = vi.fn()
    render(<CreateAccountDialog open onOpenChange={vi.fn()} onSuccess={onSuccess} />)

    const form = screen.getByRole('button', { name: 'Create Account' }).closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(commitMock).toHaveBeenCalledTimes(1)
    })
  })

  it('maps GraphQL violations to field errors', async () => {
    vi.mocked(validateAccountForm).mockReturnValue({
      values: { ownerName: 'John', document: '12345678901', branch: '0001', number: '12345-6', initialBalance: '0' },
      errors: {},
    })

    commitMock.mockImplementation(({ onError }) => {
      onError?.({
        response: {
          errors: [{
            message: 'Validation failed',
            extensions: {
              code: 'VALIDATION_ERROR',
              violations: [{ field: 'document', message: 'Document already exists.' }],
            },
          }],
        },
      })
    })

    render(<CreateAccountDialog open onOpenChange={vi.fn()} />)

    const form = screen.getByRole('button', { name: 'Create Account' }).closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Document already exists.')).toBeInTheDocument()
    })
  })
})
