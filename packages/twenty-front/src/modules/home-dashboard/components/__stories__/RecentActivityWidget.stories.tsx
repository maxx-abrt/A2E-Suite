import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';

import { RecentActivityWidgetContent } from '@/home-dashboard/components/RecentActivityWidgetContent';

const meta: Meta<typeof RecentActivityWidgetContent> = {
  title: 'Modules/HomeDashboard/RecentActivityWidget',
  component: RecentActivityWidgetContent,
  decorators: [ComponentDecorator],
  args: {
    entries: [
      {
        id: 'activity-1',
        title: 'Created company',
        subtitle: 'Ada Lovelace',
        trailingLabel: '18 Sep',
      },
      {
        id: 'activity-2',
        title: 'Updated task',
        subtitle: 'Grace Hopper',
        trailingLabel: '17 Sep',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof RecentActivityWidgetContent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { entries: [] },
};
