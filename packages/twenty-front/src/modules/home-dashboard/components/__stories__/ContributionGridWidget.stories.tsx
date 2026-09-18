import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';

import { ContributionGridWidgetContent } from '@/home-dashboard/components/ContributionGridWidgetContent';
import { buildContributionGrid } from '@/home-dashboard/utils/buildContributionGrid';

const weeks = buildContributionGrid({
  activityTimestamps: [
    '2026-09-07T10:00:00.000Z',
    '2026-09-07T16:00:00.000Z',
    '2026-09-10T09:00:00.000Z',
    '2026-09-16T09:00:00.000Z',
  ],
  today: new Date(2026, 8, 18),
  weekCount: 12,
});

const meta: Meta<typeof ContributionGridWidgetContent> = {
  title: 'Modules/HomeDashboard/ContributionGridWidget',
  component: ContributionGridWidgetContent,
  decorators: [ComponentDecorator],
  args: { weeks },
};

export default meta;
type Story = StoryObj<typeof ContributionGridWidgetContent>;

export const Default: Story = {};
