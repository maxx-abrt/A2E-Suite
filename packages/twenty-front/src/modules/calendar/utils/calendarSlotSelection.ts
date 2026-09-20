import { type CalendarEventSlotSelection } from '@/calendar/types/CalendarEventSlotSelection';

export const INITIAL_CALENDAR_SLOT_SELECTION: CalendarEventSlotSelection = {
  anchorIndex: null,
  focusIndex: null,
};

// Keyboard model: `focus` is plain navigation, `start` opens a selection,
// `extend` grows it and `reset` clears it. Keeping this pure lets the keyboard
// path be tested without a browser, which is what makes it a first-class
// alternative to dragging rather than an afterthought.
export const reduceCalendarSlotSelection = (
  state: CalendarEventSlotSelection,
  action:
    | { type: 'focus'; index: number }
    | { type: 'start'; index: number }
    | { type: 'extend'; index: number }
    | { type: 'reset' },
): CalendarEventSlotSelection => {
  switch (action.type) {
    case 'focus':
      return { anchorIndex: null, focusIndex: action.index };
    case 'start':
      return { anchorIndex: action.index, focusIndex: action.index };
    case 'extend':
      return {
        anchorIndex: state.anchorIndex ?? action.index,
        focusIndex: action.index,
      };
    case 'reset':
      return INITIAL_CALENDAR_SLOT_SELECTION;
  }
};

export const getCalendarSlotSelectionRange = (
  selection: CalendarEventSlotSelection,
): { startIndex: number; endIndex: number } | null => {
  if (selection.anchorIndex === null || selection.focusIndex === null) {
    return null;
  }

  return {
    startIndex: Math.min(selection.anchorIndex, selection.focusIndex),
    endIndex: Math.max(selection.anchorIndex, selection.focusIndex),
  };
};
