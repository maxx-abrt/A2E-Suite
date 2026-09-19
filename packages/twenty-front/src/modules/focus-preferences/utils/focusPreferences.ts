import { DEFAULT_FOCUS_PREFERENCES } from '@/focus-preferences/constants/DefaultFocusPreferences';
import { FOCUS_DENSITIES } from '@/focus-preferences/constants/FocusDensities';
import { FOCUS_PREFERENCE_BOUNDS } from '@/focus-preferences/constants/FocusPreferenceBounds';
import {
  type FocusDensity,
  type FocusPreferences,
} from '@/focus-preferences/types/FocusPreferences';

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const isFocusDensity = (value: unknown): value is FocusDensity =>
  typeof value === 'string' && (FOCUS_DENSITIES as string[]).includes(value);

export const clampFocusDurationMinutes = (minutes: number): number =>
  clampNumber(
    Math.round(minutes),
    FOCUS_PREFERENCE_BOUNDS.focusDurationMinutes.min,
    FOCUS_PREFERENCE_BOUNDS.focusDurationMinutes.max,
  );

export const clampFocusSessionTarget = (target: number): number =>
  clampNumber(
    Math.round(target),
    FOCUS_PREFERENCE_BOUNDS.sessionTarget.min,
    FOCUS_PREFERENCE_BOUNDS.sessionTarget.max,
  );

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const sanitizeFocusPreferences = (value: unknown): FocusPreferences => {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_FOCUS_PREFERENCES;
  }

  const candidate = value as Partial<FocusPreferences>;

  return {
    density: isFocusDensity(candidate.density)
      ? candidate.density
      : DEFAULT_FOCUS_PREFERENCES.density,
    easyRead:
      typeof candidate.easyRead === 'boolean'
        ? candidate.easyRead
        : DEFAULT_FOCUS_PREFERENCES.easyRead,
    shortcutsEnabled:
      typeof candidate.shortcutsEnabled === 'boolean'
        ? candidate.shortcutsEnabled
        : DEFAULT_FOCUS_PREFERENCES.shortcutsEnabled,
    pomodoroFocusDurationMinutes: isFiniteNumber(
      candidate.pomodoroFocusDurationMinutes,
    )
      ? clampFocusDurationMinutes(candidate.pomodoroFocusDurationMinutes)
      : DEFAULT_FOCUS_PREFERENCES.pomodoroFocusDurationMinutes,
    pomodoroSessionTarget: isFiniteNumber(candidate.pomodoroSessionTarget)
      ? clampFocusSessionTarget(candidate.pomodoroSessionTarget)
      : DEFAULT_FOCUS_PREFERENCES.pomodoroSessionTarget,
  };
};

export const isValidFocusPreferences = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<FocusPreferences>;

  return (
    isFocusDensity(candidate.density) &&
    typeof candidate.easyRead === 'boolean' &&
    typeof candidate.shortcutsEnabled === 'boolean' &&
    isFiniteNumber(candidate.pomodoroFocusDurationMinutes) &&
    isFiniteNumber(candidate.pomodoroSessionTarget)
  );
};
