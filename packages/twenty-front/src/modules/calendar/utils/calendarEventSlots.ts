import { type Temporal } from 'temporal-polyfill';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';

// A slot range is inclusive, so the event ends one hour after the last selected
// slot. A single selected slot therefore yields a one-hour default event.
export const buildCalendarEventDraftFromSlotRange = ({
  startSlot,
  endSlot,
}: {
  startSlot: CalendarEventSlot;
  endSlot: CalendarEventSlot;
}): CalendarEventDraft => {
  const endDateTime = endSlot.day
    .toPlainDateTime({ hour: endSlot.hour, minute: endSlot.minute })
    .add({ hours: 1 });

  return {
    title: '',
    description: '',
    location: '',
    isFullDay: false,
    isCanceled: false,
    startDay: startSlot.day,
    startHour: startSlot.hour,
    startMinute: startSlot.minute,
    endDay: endDateTime.toPlainDate(),
    endHour: endDateTime.hour,
    endMinute: endDateTime.minute,
  };
};

export const buildCalendarEventDraftFromSlot = (
  slot: CalendarEventSlot,
): CalendarEventDraft =>
  buildCalendarEventDraftFromSlotRange({ startSlot: slot, endSlot: slot });

export const getCalendarSlotFromIndex = ({
  day,
  index,
  slotsPerHour,
}: {
  day: Temporal.PlainDate;
  index: number;
  slotsPerHour: number;
}): CalendarEventSlot => ({
  day,
  hour: Math.floor(index / slotsPerHour),
  minute: (index % slotsPerHour) * (60 / slotsPerHour),
});

export const getCalendarSlotIndex = ({
  slot,
  slotsPerHour,
}: {
  slot: CalendarEventSlot;
  slotsPerHour: number;
}): number =>
  slot.hour * slotsPerHour + Math.floor(slot.minute / (60 / slotsPerHour));
