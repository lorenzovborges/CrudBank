import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="p-4">
          Make changes to your account here. Click save when you're done.
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="p-4">
          Change your password here. After saving, you'll be logged out.
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="p-4">
          Update your settings here. Changes will be saved automatically.
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList variant="line">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="p-4">
          Make changes to your account here. Click save when you're done.
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="p-4">
          Change your password here. After saving, you'll be logged out.
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="p-4">
          Update your settings here. Changes will be saved automatically.
        </div>
      </TabsContent>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="flex gap-4">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <div>
        <TabsContent value="account">
          <div className="p-4">
            Make changes to your account here. Click save when you're done.
          </div>
        </TabsContent>
        <TabsContent value="password">
          <div className="p-4">
            Change your password here. After saving, you'll be logged out.
          </div>
        </TabsContent>
        <TabsContent value="settings">
          <div className="p-4">
            Update your settings here. Changes will be saved automatically.
          </div>
        </TabsContent>
      </div>
    </Tabs>
  ),
};
