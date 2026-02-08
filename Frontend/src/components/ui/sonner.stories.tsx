import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [(Story) => <><Story /><Toaster /></>],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        onClick={() => toast('Default message', {
          description: 'This is a default toast notification',
        })}
      >
        Show Default Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.success('Success!', {
          description: 'Your operation was successful',
        })}
      >
        Show Success Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error('Error!', {
          description: 'Something went wrong',
        })}
      >
        Show Error Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info('Info', {
          description: 'Here is some information',
        })}
      >
        Show Info Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning('Warning!', {
          description: 'This is a warning message',
        })}
      >
        Show Warning Toast
      </Button>
    </div>
  ),
};
