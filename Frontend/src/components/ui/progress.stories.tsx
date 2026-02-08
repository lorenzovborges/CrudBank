import type { Meta, StoryObj } from '@storybook/react-vite'
import { Progress } from '@/components/ui/progress'

const meta = {
  title: 'UI/Progress',
  component: Progress,
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
} satisfies Meta<typeof Progress>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 50,
  },
}

export const Empty: Story = {
  args: {
    value: 0,
  },
}

export const Full: Story = {
  args: {
    value: 100,
  },
}

export const Interactive: Story = {
  args: {
    value: 50,
  },
}

export const MultipleStates: Story = {
  render: () => (
    <div className="space-y-4 w-96">
      <div className="space-y-2">
        <div className="text-sm font-medium">0% Complete</div>
        <Progress value={0} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">25% Complete</div>
        <Progress value={25} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">50% Complete</div>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">75% Complete</div>
        <Progress value={75} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">100% Complete</div>
        <Progress value={100} />
      </div>
    </div>
  ),
}
