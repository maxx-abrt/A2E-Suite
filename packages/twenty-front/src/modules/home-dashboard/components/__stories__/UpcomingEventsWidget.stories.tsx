import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';

import { UpcomingEventsWidgetContent } from '@/home-dashboard/components/UpcomingEventsWidgetContent';

const meta: Meta<typeof UpcomingEventsWidgetContent> = {
  title: 'Modules/HomeDashboard/UpcomingEventsWidget',
  component: UpcomingEventsWidgetContent,
  decorators: [ComponentDecorator],
  args: {
    entries: [
      {
        id: 'event-1',
        title: 'Team sync',
        subtitle: '10:00 – 10:30',
        trailingLabel: '18 Sep',
      },
      {
        id: 'event-2',
        title: 'Offsite',
        subtitle: 'All day',
        trailingLabel: '22 Sep',
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof UpcomingEventsWidgetContent>;

export const Default: Story = {};

export const Empty: Story = {
  args: { entries: [] },
};
