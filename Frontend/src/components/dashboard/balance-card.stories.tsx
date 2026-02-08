import type { Meta, StoryObj } from '@storybook/react-vite'
import { BalanceCard } from '@/components/dashboard/BalanceCard'

const meta = {
  title: 'Custom/BalanceCard',
  component: BalanceCard,
} satisfies Meta<typeof BalanceCard>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { totalBalanceCents: 150000, accountCount: 2 },
}

export const ZeroBalance: Story = {
  args: { totalBalanceCents: 0, accountCount: 0 },
}

export const LargeBalance: Story = {
  args: { totalBalanceCents: 99999999, accountCount: 15 },
}
