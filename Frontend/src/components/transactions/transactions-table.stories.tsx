import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TransactionsTable } from '@/components/transactions/TransactionsTable'

const mockTransactions = [
  { id: '1', counterpartyLabel: 'Alice - 0001/12345-6', amount: '150.00', currency: 'BRL', description: 'Monthly payment', createdAt: '2026-01-15T10:00:00Z' },
  { id: '2', counterpartyLabel: 'Bob - 0001/54321-0', amount: '75.50', currency: 'BRL', description: 'Dinner split', createdAt: '2026-01-14T18:30:00Z' },
  { id: '3', counterpartyLabel: 'Charlie - 0002/11111-1', amount: '200.00', currency: 'BRL', description: 'Rent share', createdAt: '2026-01-13T09:00:00Z' },
]

const meta = {
  title: 'Custom/TransactionsTable',
  component: TransactionsTable,
  args: {
    transactions: mockTransactions,
    direction: 'SENT',
    hasNextPage: false,
    onLoadMore: fn(),
    isLoadingMore: false,
  },
} satisfies Meta<typeof TransactionsTable>
export default meta
type Story = StoryObj<typeof meta>

export const Sent: Story = {}

export const Received: Story = {
  args: { direction: 'RECEIVED' },
}

export const Empty: Story = {
  args: { transactions: [] },
}

export const WithLoadMore: Story = {
  args: { hasNextPage: true },
}
