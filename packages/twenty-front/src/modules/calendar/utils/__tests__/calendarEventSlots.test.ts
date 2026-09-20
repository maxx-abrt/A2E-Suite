import { Temporal } from 'temporal-polyfill';

import {
  buildCalendarEventDraftFromSlotRange,
  getCalendarSlotFromIndex,
  getCalendarSlotIndex,
} from '@/calendar/utils/calendarEventSlots';

const day = Temporal.PlainDate.from('2026-07-15');

describe('calendarEventSlots', () => {
  it('round-trips a slot index', () => {
    const slot = getCalendarSlotFromIndex({ day, index: 14, slotsPerHour: 1 });

    expect(slot.hour).toBe(14);
    expect(slot.minute).toBe(0);
    expect(getCalendarSlotIndex({ slot, slotsPerHour: 1 })).toBe(14);
  });

  it('builds a one-hour draft from a single slot', () => {
    const draft = buildCalendarEventDraftFromSlotRange({
      startSlot: { day, hour: 14, minute: 0 },
      endSlot: { day, hour: 14, minute: 0 },
    });

    expect(draft.startHour).toBe(14);
    expect(draft.endHour).toBe(15);
    expect(draft.endDay.toString()).toBe('2026-07-15');
  });

  it('ends one hour after the last selected slot in a range', () => {
    const draft = buildCalendarEventDraftFromSlotRange({
      startSlot: { day, hour: 22, minute: 0 },
      endSlot: { day, hour: 23, minute: 0 },
    });

    expect(draft.startHour).toBe(22);
    expect(draft.endDay.toString()).toBe('2026-07-16');
    expect(draft.endHour).toBe(0);
  });
});
