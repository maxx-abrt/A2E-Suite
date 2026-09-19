// Bounds protect the persisted preference from a hand-edited localStorage
// payload: the widget must never render a 0-second or unbounded timer.
export const FOCUS_PREFERENCE_BOUNDS = {
  focusDurationMinutes: { min: 5, max: 90 },
  sessionTarget: { min: 1, max: 12 },
};
