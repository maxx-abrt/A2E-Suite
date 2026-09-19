import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { ThemeProvider } from 'twenty-ui/theme-constants';

import { FocusPreferencesSettings } from '@/focus-preferences/components/FocusPreferencesSettings';
import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';

jest.mock('@/ui/input/components/Select', () => ({
  Select: ({
    dropdownId,
    label,
    value,
    onChange,
    options,
  }: {
    dropdownId: string;
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    options: { label: string; value: string | number }[];
  }) => (
    <label>
      <span>{label}</span>
      <select
        data-testid={dropdownId}
        value={value}
        onChange={(event) =>
          onChange(
            typeof value === 'number'
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

const store = getDefaultStore();

// base-ui's Switch forwards root clicks to a synthetic PointerEvent on its
// hidden checkbox; jsdom does not implement PointerEvent, so alias it.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
  }
});

const renderSettings = () =>
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider colorScheme="light">
        <FocusPreferencesSettings />
      </ThemeProvider>
    </I18nProvider>,
  );

describe('FocusPreferencesSettings', () => {
  beforeEach(() => {
    store.set(focusPreferencesState.atom, DEFAULT_FOCUS_PREFERENCES);
  });

  it('renders the density, Pomodoro and shortcut controls', () => {
    renderSettings();

    expect(
      screen.getByTestId('focus-preference-density-select'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('focus-preference-duration-select'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('focus-preference-session-target-select'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Easy read' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument();
  });

  it('persists density, Pomodoro and shortcut changes', () => {
    renderSettings();

    fireEvent.change(screen.getByTestId('focus-preference-density-select'), {
      target: { value: 'compact' },
    });
    fireEvent.change(screen.getByTestId('focus-preference-duration-select'), {
      target: { value: '45' },
    });
    fireEvent.change(
      screen.getByTestId('focus-preference-session-target-select'),
      { target: { value: '6' } },
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Easy read' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Keyboard shortcuts' }));

    expect(store.get(focusPreferencesState.atom)).toEqual({
      density: 'compact',
      easyRead: true,
      shortcutsEnabled: false,
      pomodoroFocusDurationMinutes: 45,
      pomodoroSessionTarget: 6,
    });
  });
});
