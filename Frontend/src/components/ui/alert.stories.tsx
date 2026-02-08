import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertCircle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
} satisfies Meta<typeof Alert>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert>
      <Info className="size-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>
        This is an informational alert message. You can use it to display helpful tips or notices to users.
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again to continue.
      </AlertDescription>
    </Alert>
  ),
}

export const WithoutTitle: Story = {
  render: () => (
    <Alert>
      <Info className="size-4" />
      <AlertDescription>
        A simple alert with just a description and no title.
      </AlertDescription>
    </Alert>
  ),
}

export const MultipleAlerts: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-2xl">
      <Alert>
        <Info className="size-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>
          This is an informational message.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          This is a destructive/warning message.
        </AlertDescription>
      </Alert>
    </div>
  ),
}
