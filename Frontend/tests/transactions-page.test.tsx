import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionsPage } from '@/pages/TransactionsPage'

const { useLazyLoadQueryMock } = vi.hoisted(() => ({
  useLazyLoadQueryMock: vi.fn(),
}))

vi.mock('react-relay', () => ({
  useLazyLoadQuery: useLazyLoadQueryMock,
  useRelayEnvironment: vi.fn(() => ({})),
  fetchQuery: vi.fn(),
}))

vi.mock('react-router', () => ({
  useLocation: vi.fn(() => ({ key: 'test' })),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
}))

vi.mock('@/graphql/AccountsQuery', () => ({ AccountsQuery: {} }))
vi.mock('@/graphql/TransactionsByAccountQuery', () => ({ TransactionsByAccountQuery: {} }))

const combinedData = {
  accounts: {
    edges: [
      { cursor: 'c1', node: { id: 'acc-1', ownerName: 'Alice', document: '12345678901', branch: '0001', number: '12345-6', currency: 'BRL', currentBalance: '1500.00', status: 'ACTIVE', createdAt: '2026-01-01', updatedAt: '2026-01-01' } },
    ],
    pageInfo: { hasNextPage: false, endCursor: 'c1' },
  },
  transactionsByAccount: {
    edges: [
      { cursor: 't1', node: { id: 'tx-1', fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: '100.00', currency: 'BRL', description: 'Test transfer', idempotencyKey: 'key-1', createdAt: '2026-01-15T10:00:00Z' } },
    ],
    pageInfo: { hasNextPage: false, endCursor: 't1' },
  },
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useLazyLoadQueryMock.mockReturnValue(combinedData)
  })

  it('renders account selector', () => {
    render(<TransactionsPage />)
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
  })

  it('renders Sent and Received tabs', () => {
    render(<TransactionsPage />)
    // Multiple tab instances may render due to Suspense boundaries
    const sentTabs = screen.getAllByRole('tab', { name: 'Sent' })
    const receivedTabs = screen.getAllByRole('tab', { name: 'Received' })
    expect(sentTabs.length).toBeGreaterThanOrEqual(1)
    expect(receivedTabs.length).toBeGreaterThanOrEqual(1)
  })

  it('renders transaction data', () => {
    render(<TransactionsPage />)
    // Both SENT and RECEIVED tabs may render with the same mock data
    const matches = screen.getAllByText('Test transfer')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty state when no active accounts', () => {
    useLazyLoadQueryMock.mockReturnValue({
      ...combinedData,
      accounts: {
        edges: [],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    })
    render(<TransactionsPage />)
    expect(screen.getByText('No active accounts found. Create an account first.')).toBeInTheDocument()
  })
})
