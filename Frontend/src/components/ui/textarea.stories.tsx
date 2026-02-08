import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from '@/components/ui/textarea'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const WithPlaceholder: Story = {
  args: {
    placeholder: 'Type your message here...',
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
}

export const WithValue: Story = {
  args: {
    value: 'This is some pre-filled content in the textarea.\n\nIt can span multiple lines.',
  },
}

export const WithRows: Story = {
  args: {
    placeholder: 'Textarea with 8 rows',
    rows: 8,
  },
}
