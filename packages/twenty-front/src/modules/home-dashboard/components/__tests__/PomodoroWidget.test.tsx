import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getDefaultStore } from 'jotai';

import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';
import { PomodoroWidget } from '@/home-dashboard/components/PomodoroWidget';

const store = getDefaultStore();

const renderWidget = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PomodoroWidget />
    </I18nProvider>,
  );

describe('PomodoroWidget', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    store.set(focusPreferencesState.atom, DEFAULT_FOCUS_PREFERENCES);
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

  it('uses the configured focus duration and session target', () => {
    store.set(focusPreferencesState.atom, {
      ...DEFAULT_FOCUS_PREFERENCES,
      pomodoroFocusDurationMinutes: 15,
      pomodoroSessionTarget: 2,
    });

    renderWidget();

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '15:00',
    );
    expect(screen.getByText('0 of 2 focus sessions today')).toBeInTheDocument();
  });

  it('re-syncs the idle clock when the focus duration preference changes', () => {
    renderWidget();

    act(() => {
      store.set(focusPreferencesState.atom, {
        ...DEFAULT_FOCUS_PREFERENCES,
        pomodoroFocusDurationMinutes: 45,
      });
    });

    expect(screen.getByTestId('home-pomodoro-clock')).toHaveTextContent(
      '45:00',
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
