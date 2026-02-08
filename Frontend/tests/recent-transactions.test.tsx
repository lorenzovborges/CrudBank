import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'

const { useLazyLoadQueryMock } = vi.hoisted(() => ({
  useLazyLoadQueryMock: vi.fn(),
}))

vi.mock('react-relay', () => ({
  useLazyLoadQuery: useLazyLoadQueryMock,
}))

vi.mock('@/graphql/RecentTransactionsQuery', () => ({
  RecentTransactionsQuery: {},
}))

describe('RecentTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state without querying when accountIds is empty', () => {
    render(<RecentTransactions accountIds={[]} refreshKey={0} />)

    expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    expect(useLazyLoadQueryMock).not.toHaveBeenCalled()
  })

  it('queries and renders transactions when accountIds exists', () => {
    useLazyLoadQueryMock.mockReturnValue({
      recentTransactions: [
        {
          type: 'SENT',
          transaction: {
            id: 'tx-1',
            amount: '10.00',
            description: 'Pix transfer',
            createdAt: '2026-01-01T12:00:00Z',
          },
        },
      ],
    })

    render(<RecentTransactions accountIds={['acc-1']} refreshKey={1} />)

    expect(useLazyLoadQueryMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Pix transfer')).toBeInTheDocument()
    expect(screen.getByText('Sent')).toBeInTheDocument()
  })

  it('renders local error fallback when query throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    useLazyLoadQueryMock.mockImplementation(() => {
      throw new Error('query failed')
    })

    try {
      render(<RecentTransactions accountIds={['acc-1']} refreshKey={1} />)
      expect(screen.getByText('Could not load recent transactions.')).toBeInTheDocument()
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
