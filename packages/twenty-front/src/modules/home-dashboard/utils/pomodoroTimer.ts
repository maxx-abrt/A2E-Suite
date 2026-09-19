// One completed Pomodoro is the habit notch the Home dashboard tracks, so the
// habit count is derived from the timer and needs no separate stored artifact.
export const POMODORO_FOCUS_DURATION_SECONDS = 25 * 60;
export const POMODORO_FOCUS_SESSION_TARGET = 4;

export const formatPomodoroClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};
