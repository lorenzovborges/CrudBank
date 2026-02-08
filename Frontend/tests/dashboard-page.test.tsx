import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { sumCents } from '@/lib/money'

vi.mock('react-router', () => ({
  useNavigate: vi.fn(() => vi.fn()),
}))

// Test the individual dashboard components directly to avoid
// complex nested useLazyLoadQuery mocking across TransferDialog,
// CreateAccountDialog, and RecentTransactions.

describe('DashboardPage components', () => {
  it('renders balance card with total balance and account count', () => {
    const balances = ['1500.00', '500.00']
    const totalBalanceCents = sumCents(balances)

    render(
      <BalanceCard totalBalanceCents={totalBalanceCents} accountCount={2} />
    )

    // sumCents(['1500.00', '500.00']) = 200000 cents = R$ 2,000.00
    expect(screen.getByText(/2\.000,00/)).toBeInTheDocument()
    expect(screen.getByText('2 active accounts')).toBeInTheDocument()
  })

  it('renders quick actions', () => {
    const noop = vi.fn()

    render(
      <QuickActions onTransferClick={noop} onNewAccountClick={noop} />
    )

    expect(screen.getByText('Transfer')).toBeInTheDocument()
    expect(screen.getByText('New Account')).toBeInTheDocument()
    expect(screen.getByText('Statements')).toBeInTheDocument()
    expect(screen.getByText('Accounts')).toBeInTheDocument()
  })
})
