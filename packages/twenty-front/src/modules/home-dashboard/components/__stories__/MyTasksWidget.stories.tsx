import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';

import { MyTasksWidgetContent } from '@/home-dashboard/components/MyTasksWidgetContent';

const meta: Meta<typeof MyTasksWidgetContent> = {
  title: 'Modules/HomeDashboard/MyTasksWidget',
  component: MyTasksWidgetContent,
  decorators: [ComponentDecorator],
  args: {
    entries: [
      {
        id: 'task-1',
        title: 'Ship the activity feed',
        subtitle: '18 Sep',
        trailingLabel: 'Overdue',
        isOverdue: true,
      },
      {
        id: 'task-2',
        title: 'Review the calendar widget',
        subtitle: '22 Sep',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof MyTasksWidgetContent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { entries: [] },
};
