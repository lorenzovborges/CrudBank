import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '@/components/ui/input'

const meta = {
  title: 'UI/Input',
  component: Input,
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'file'],
    },
  },
} satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    type: 'text',
  },
}

export const WithPlaceholder: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter your email...',
  },
}

export const Disabled: Story = {
  args: {
    type: 'text',
    placeholder: 'Disabled input',
    disabled: true,
  },
}

export const Error: Story = {
  args: {
    type: 'text',
    placeholder: 'Error state',
    'aria-invalid': 'true',
  },
}

export const FileUpload: Story = {
  args: {
    type: 'file',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
}
