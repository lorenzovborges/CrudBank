import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditAccountDialog } from '@/components/accounts/EditAccountDialog'
import { isValidBrazilDocument } from '@/lib/validation/document'

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

vi.mock('@/graphql/UpdateAccountMutation', () => ({
  UpdateAccountMutation: {},
}))

vi.mock('@/lib/validation/document', () => ({
  isValidBrazilDocument: vi.fn(() => true),
  normalizeDocument: vi.fn((doc: string) => doc.replace(/\D/g, '')),
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

const mockAccount = { id: 'acc-1', ownerName: 'Alice Johnson', document: '123.456.789-00' }

describe('EditAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when account is null', () => {
    const { container } = render(<EditAccountDialog open onOpenChange={vi.fn()} account={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('pre-fills form with account data', () => {
    render(<EditAccountDialog open onOpenChange={vi.fn()} account={mockAccount} />)
    expect(screen.getByLabelText('Owner Name')).toHaveValue('Alice Johnson')
    expect(screen.getByLabelText('Document (CPF/CNPJ)')).toHaveValue('123.456.789-00')
  })

  it('shows validation errors for short name', async () => {
    vi.mocked(isValidBrazilDocument).mockReturnValue(true)

    render(<EditAccountDialog open onOpenChange={vi.fn()} account={{ ...mockAccount, ownerName: 'AB' }} />)

    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Owner name must be between 3 and 120 characters.')).toBeInTheDocument()
    })
    expect(commitMock).not.toHaveBeenCalled()
  })

  it('calls mutation on successful validation', async () => {
    vi.mocked(isValidBrazilDocument).mockReturnValue(true)

    commitMock.mockImplementation(({ onCompleted }) => {
      onCompleted?.()
    })

    render(<EditAccountDialog open onOpenChange={vi.fn()} account={mockAccount} />)

    const form = screen.getByRole('button', { name: 'Save Changes' }).closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(commitMock).toHaveBeenCalledTimes(1)
    })
  })
})
