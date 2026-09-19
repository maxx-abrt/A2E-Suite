import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';

import {
  PomodoroWidgetContent,
  type PomodoroWidgetContentProps,
} from '@/home-dashboard/components/PomodoroWidgetContent';

const noop = () => {};

const renderWidget = ({
  secondsRemaining = 1500,
  isRunning = false,
  completedFocusSessions = 1,
  focusSessionTarget = 4,
  onStart = noop,
  onPause = noop,
  onReset = noop,
}: Partial<PomodoroWidgetContentProps> = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PomodoroWidgetContent
        secondsRemaining={secondsRemaining}
        isRunning={isRunning}
        completedFocusSessions={completedFocusSessions}
        focusSessionTarget={focusSessionTarget}
        onStart={onStart}
        onPause={onPause}
        onReset={onReset}
      />
    </I18nProvider>,
  );

describe('PomodoroWidgetContent', () => {
  it('renders the clock, habit count and filled habit dots', () => {
    renderWidget();

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '25:00',
    );
    expect(screen.getByText('1 of 4 focus sessions today')).toBeInTheDocument();
    expect(screen.getByTestId('home-pomodoro-habit-0')).toHaveAttribute(
      'data-done',
      'true',
    );
    expect(screen.getByTestId('home-pomodoro-habit-1')).toHaveAttribute(
      'data-done',
      'false',
    );
  });

  it('starts the timer from the idle state', () => {
    const onStart = jest.fn();

    renderWidget({ onStart });

    fireEvent.click(screen.getByTestId('home-pomodoro-toggle'));

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('pauses the timer while running', () => {
    const onPause = jest.fn();

    renderWidget({ isRunning: true, onPause });

    expect(screen.getByTestId('home-pomodoro-toggle')).toHaveTextContent(
      'Pause',
    );

    fireEvent.click(screen.getByTestId('home-pomodoro-toggle'));

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('resets the timer', () => {
    const onReset = jest.fn();

    renderWidget({ onReset });

    fireEvent.click(screen.getByTestId('home-pomodoro-reset'));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
