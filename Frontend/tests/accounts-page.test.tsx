import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountsPage } from '@/pages/AccountsPage'

const { useLazyLoadQueryMock } = vi.hoisted(() => ({
  useLazyLoadQueryMock: vi.fn(),
}))

const commitMock = vi.fn()

vi.mock('react-relay', () => ({
  useLazyLoadQuery: useLazyLoadQueryMock,
  useMutation: vi.fn(() => [commitMock, false]),
  useRelayEnvironment: vi.fn(() => ({})),
  fetchQuery: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock('@/graphql/AccountsQuery', () => ({ AccountsQuery: {} }))
vi.mock('@/graphql/CreateAccountMutation', () => ({ CreateAccountMutation: {} }))
vi.mock('@/graphql/UpdateAccountMutation', () => ({ UpdateAccountMutation: {} }))
vi.mock('@/graphql/DeactivateAccountMutation', () => ({ DeactivateAccountMutation: {} }))
vi.mock('@/lib/validation/account', () => ({ validateAccountForm: vi.fn() }))
vi.mock('@/lib/validation/document', () => ({
  isValidBrazilDocument: vi.fn(() => true),
  normalizeDocument: vi.fn((d: string) => d),
}))
vi.mock('@/lib/errors/graphql', () => ({
  parseGraphqlError: vi.fn(() => ({ code: undefined, message: 'Error', userMessage: 'Something went wrong', violations: [] })),
  violationsToFieldErrors: vi.fn(() => ({})),
}))

const accountsData = {
  accounts: {
    edges: [
      { cursor: 'c1', node: { id: 'acc-1', ownerName: 'Alice Johnson', document: '123.456.789-00', branch: '0001', number: '12345-6', currency: 'BRL', currentBalance: '1500.00', status: 'ACTIVE', createdAt: '2026-01-01', updatedAt: '2026-01-01' } },
      { cursor: 'c2', node: { id: 'acc-2', ownerName: 'Bob Smith', document: '987.654.321-00', branch: '0001', number: '54321-0', currency: 'BRL', currentBalance: '500.00', status: 'ACTIVE', createdAt: '2026-01-01', updatedAt: '2026-01-01' } },
    ],
    pageInfo: { hasNextPage: false, endCursor: 'c2' },
  },
}

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLazyLoadQueryMock.mockReturnValue(accountsData)
  })

  it('renders account list', () => {
    render(<AccountsPage />)
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('shows New Account button', () => {
    render(<AccountsPage />)
    // The button and the dialog title both contain "New Account"
    const matches = screen.getAllByText('New Account')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('hides Load More when hasNextPage is false', () => {
    render(<AccountsPage />)
    expect(screen.queryByText('Load More')).not.toBeInTheDocument()
  })

  it('shows Load More when hasNextPage is true', () => {
    useLazyLoadQueryMock.mockReturnValue({
      accounts: {
        ...accountsData.accounts,
        pageInfo: { hasNextPage: true, endCursor: 'c2' },
      },
    })
    render(<AccountsPage />)
    expect(screen.getByText('Load More')).toBeInTheDocument()
  })
})
