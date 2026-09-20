// Keyboard slot selection. `anchorIndex` is the slot where the selection began,
// `focusIndex` is the slot currently focused; both are indices into the day's
// slot list (0 = 00:00). A null anchor means navigation only, not a selection.
export type CalendarEventSlotSelection = {
  anchorIndex: number | null;
  focusIndex: number | null;
};

export type CalendarEventSlotSelectionAction =
  | { type: 'focus'; index: number }
  | { type: 'start'; index: number }
  | { type: 'extend'; index: number }
  | { type: 'reset' };
