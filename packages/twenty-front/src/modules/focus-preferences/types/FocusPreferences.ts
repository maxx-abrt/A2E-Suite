export type FocusDensity = 'comfortable' | 'compact';

export type FocusPreferences = {
  density: FocusDensity;
  easyRead: boolean;
  shortcutsEnabled: boolean;
  pomodoroFocusDurationMinutes: number;
  pomodoroSessionTarget: number;
};
