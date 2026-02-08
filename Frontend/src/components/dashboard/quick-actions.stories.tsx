import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { MemoryRouter } from 'react-router'
import { QuickActions } from '@/components/dashboard/QuickActions'

const meta = {
  title: 'Custom/QuickActions',
  component: QuickActions,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  args: {
    onTransferClick: fn(),
    onNewAccountClick: fn(),
  },
} satisfies Meta<typeof QuickActions>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
