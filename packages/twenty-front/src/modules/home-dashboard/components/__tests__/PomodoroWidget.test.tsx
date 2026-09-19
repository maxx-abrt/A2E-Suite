import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PomodoroWidget } from '@/home-dashboard/components/PomodoroWidget';

const renderWidget = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PomodoroWidget />
    </I18nProvider>,
  );

describe('PomodoroWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts down one second at a time once started', () => {
    renderWidget();

    fireEvent.click(screen.getByTestId('home-pomodoro-toggle'));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '24:59',
    );
  });

  it('completes a session, resets the clock and fills a habit dot', () => {
    renderWidget();

    fireEvent.click(screen.getByTestId('home-pomodoro-toggle'));

    act(() => {
      jest.advanceTimersByTime(1500 * 1000);
    });

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '25:00',
    );
    expect(screen.getByText('1 of 4 focus sessions today')).toBeInTheDocument();
    expect(screen.getByTestId('home-pomodoro-habit-0')).toHaveAttribute(
      'data-done',
      'true',
    );
    expect(screen.getByTestId('home-pomodoro-toggle')).toHaveTextContent(
      'Start',
    );
  });

  it('resets a running timer to the full duration', () => {
    renderWidget();

    fireEvent.click(screen.getByTestId('home-pomodoro-toggle'));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    fireEvent.click(screen.getByTestId('home-pomodoro-reset'));

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '25:00',
    );
  });
});
