import { useCallback } from 'react';

import { focusPreferencesState } from '@/focus-preferences/states/focusPreferencesState';
import {
  type FocusDensity,
  type FocusPreferences,
} from '@/focus-preferences/types/FocusPreferences';
import { sanitizeFocusPreferences } from '@/focus-preferences/utils/focusPreferences';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';

export type UseFocusPreferencesResult = {
  focusPreferences: FocusPreferences;
  setDensity: (density: FocusDensity) => void;
  setEasyRead: (easyRead: boolean) => void;
  setShortcutsEnabled: (shortcutsEnabled: boolean) => void;
  setPomodoroFocusDurationMinutes: (minutes: number) => void;
  setPomodoroSessionTarget: (target: number) => void;
  resetFocusPreferences: () => void;
};

export const useFocusPreferences = (): UseFocusPreferencesResult => {
  const [focusPreferences, setFocusPreferences] = useAtomState(
    focusPreferencesState,
  );

  const updateFocusPreferences = useCallback(
    (patch: Partial<FocusPreferences>) => {
      setFocusPreferences((previous) =>
        sanitizeFocusPreferences({ ...previous, ...patch }),
      );
    },
    [setFocusPreferences],
  );

  const setDensity = useCallback(
    (density: FocusDensity) => updateFocusPreferences({ density }),
    [updateFocusPreferences],
  );

  const setEasyRead = useCallback(
    (easyRead: boolean) => updateFocusPreferences({ easyRead }),
    [updateFocusPreferences],
  );

  const setShortcutsEnabled = useCallback(
    (shortcutsEnabled: boolean) => updateFocusPreferences({ shortcutsEnabled }),
    [updateFocusPreferences],
  );

  const setPomodoroFocusDurationMinutes = useCallback(
    (minutes: number) =>
      updateFocusPreferences({ pomodoroFocusDurationMinutes: minutes }),
    [updateFocusPreferences],
  );

  const setPomodoroSessionTarget = useCallback(
    (target: number) =>
      updateFocusPreferences({ pomodoroSessionTarget: target }),
    [updateFocusPreferences],
  );

  const resetFocusPreferences = useCallback(() => {
    setFocusPreferences(sanitizeFocusPreferences(undefined));
  }, [setFocusPreferences]);

  return {
    focusPreferences,
    setDensity,
    setEasyRead,
    setShortcutsEnabled,
    setPomodoroFocusDurationMinutes,
    setPomodoroSessionTarget,
    resetFocusPreferences,
  };
};
