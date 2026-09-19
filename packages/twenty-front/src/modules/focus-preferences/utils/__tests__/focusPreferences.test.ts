import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import {
  clampFocusDurationMinutes,
  clampFocusSessionTarget,
  isFocusDensity,
  isValidFocusPreferences,
  sanitizeFocusPreferences,
} from '@/focus-preferences/utils/focusPreferences';

describe('focusPreferences', () => {
  it('falls back to the defaults for a non-object payload', () => {
    expect(sanitizeFocusPreferences(undefined)).toEqual(
      DEFAULT_FOCUS_PREFERENCES,
    );
    expect(sanitizeFocusPreferences('compact')).toEqual(
      DEFAULT_FOCUS_PREFERENCES,
    );
  });

  it('keeps a valid payload untouched', () => {
    const validPayload = {
      density: 'compact' as const,
      easyRead: true,
      shortcutsEnabled: false,
      pomodoroFocusDurationMinutes: 45,
      pomodoroSessionTarget: 6,
    };

    expect(sanitizeFocusPreferences(validPayload)).toEqual(validPayload);
  });

  it('repairs an invalid density while keeping the other values', () => {
    const sanitized = sanitizeFocusPreferences({
      density: 'dense',
      easyRead: true,
      shortcutsEnabled: false,
      pomodoroFocusDurationMinutes: 45,
      pomodoroSessionTarget: 6,
    });

    expect(sanitized).toEqual({
      density: 'comfortable',
      easyRead: true,
      shortcutsEnabled: false,
      pomodoroFocusDurationMinutes: 45,
      pomodoroSessionTarget: 6,
    });
  });

  it('clamps out-of-range Pomodoro values', () => {
    expect(clampFocusDurationMinutes(200)).toBe(90);
    expect(clampFocusDurationMinutes(0)).toBe(5);
    expect(clampFocusSessionTarget(50)).toBe(12);
    expect(clampFocusSessionTarget(-3)).toBe(1);
  });

  it('recognizes only the known densities', () => {
    expect(isFocusDensity('comfortable')).toBe(true);
    expect(isFocusDensity('compact')).toBe(true);
    expect(isFocusDensity('dense')).toBe(false);
    expect(isFocusDensity(undefined)).toBe(false);
  });

  it('rejects an invalid stored payload for localStorage hydration', () => {
    expect(
      isValidFocusPreferences({
        density: 'compact',
        easyRead: true,
        shortcutsEnabled: false,
        pomodoroFocusDurationMinutes: 45,
        pomodoroSessionTarget: 6,
      }),
    ).toBe(true);
    expect(
      isValidFocusPreferences({
        density: 'dense',
        easyRead: true,
        shortcutsEnabled: false,
        pomodoroFocusDurationMinutes: 45,
        pomodoroSessionTarget: 6,
      }),
    ).toBe(false);
    expect(isValidFocusPreferences(null)).toBe(false);
  });
});
