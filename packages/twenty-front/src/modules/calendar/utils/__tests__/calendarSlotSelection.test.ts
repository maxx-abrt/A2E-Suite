import {
  getCalendarSlotSelectionRange,
  INITIAL_CALENDAR_SLOT_SELECTION,
  reduceCalendarSlotSelection,
} from '@/calendar/utils/calendarSlotSelection';

describe('reduceCalendarSlotSelection', () => {
  it('moves focus without starting a selection', () => {
    const state = reduceCalendarSlotSelection(INITIAL_CALENDAR_SLOT_SELECTION, {
      type: 'focus',
      index: 5,
    });

    expect(state).toEqual({ anchorIndex: null, focusIndex: 5 });
    expect(getCalendarSlotSelectionRange(state)).toBeNull();
  });

  it('opens a selection on start', () => {
    const state = reduceCalendarSlotSelection(INITIAL_CALENDAR_SLOT_SELECTION, {
      type: 'start',
      index: 9,
    });

    expect(state).toEqual({ anchorIndex: 9, focusIndex: 9 });
    expect(getCalendarSlotSelectionRange(state)).toEqual({
      startIndex: 9,
      endIndex: 9,
    });
  });

  it('extends a selection keeping the anchor fixed', () => {
    let state = reduceCalendarSlotSelection(INITIAL_CALENDAR_SLOT_SELECTION, {
      type: 'start',
      index: 9,
    });
    state = reduceCalendarSlotSelection(state, { type: 'extend', index: 12 });

    expect(state).toEqual({ anchorIndex: 9, focusIndex: 12 });
    expect(getCalendarSlotSelectionRange(state)).toEqual({
      startIndex: 9,
      endIndex: 12,
    });
  });

  it('orders a backwards selection range', () => {
    let state = reduceCalendarSlotSelection(INITIAL_CALENDAR_SLOT_SELECTION, {
      type: 'start',
      index: 12,
    });
    state = reduceCalendarSlotSelection(state, { type: 'extend', index: 9 });

    expect(getCalendarSlotSelectionRange(state)).toEqual({
      startIndex: 9,
      endIndex: 12,
    });
  });

  it('starts a selection when extending without an anchor', () => {
    const state = reduceCalendarSlotSelection(INITIAL_CALENDAR_SLOT_SELECTION, {
      type: 'extend',
      index: 3,
    });

    expect(state).toEqual({ anchorIndex: 3, focusIndex: 3 });
  });

  it('resets to the initial selection', () => {
    const state = reduceCalendarSlotSelection(
      { anchorIndex: 2, focusIndex: 7 },
      { type: 'reset' },
    );

    expect(state).toEqual(INITIAL_CALENDAR_SLOT_SELECTION);
  });
});
