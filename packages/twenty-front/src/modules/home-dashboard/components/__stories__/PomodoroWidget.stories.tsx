import { type Meta, type StoryObj } from '@storybook/react-vite';
import { ComponentDecorator } from 'twenty-ui/testing';

import { PomodoroWidgetContent } from '@/home-dashboard/components/PomodoroWidgetContent';

const meta: Meta<typeof PomodoroWidgetContent> = {
  title: 'Modules/HomeDashboard/PomodoroWidget',
  component: PomodoroWidgetContent,
  decorators: [ComponentDecorator],
  args: {
    secondsRemaining: 1500,
    isRunning: false,
    completedFocusSessions: 1,
    focusSessionTarget: 4,
    onStart: () => {},
    onPause: () => {},
    onReset: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof PomodoroWidgetContent>;

export const Default: Story = {};

export const Running: Story = {
  args: { secondsRemaining: 743, isRunning: true, completedFocusSessions: 3 },
};
