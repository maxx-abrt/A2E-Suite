import { Temporal } from 'temporal-polyfill';

import { type CalendarEventSlot } from '@/calendar/types/CalendarEventSlot';

// `compatible` disambiguation is the DST contract: a time inside a spring-forward
// gap shifts forward (02:30 -> 03:30) and a fall-back overlap keeps the earlier
// offset. The saved instant is therefore always a real wall-clock time in the
// user's zone, and editing it back never lands on a nonexistent time.
export const buildCalendarEventInstant = ({
  slot,
  timeZone,
}: {
  slot: CalendarEventSlot;
  timeZone: string;
}): string => {
  const zonedDateTime = Temporal.ZonedDateTime.from(
    {
      timeZone,
      year: slot.day.year,
      month: slot.day.month,
      day: slot.day.day,
      hour: slot.hour,
      minute: slot.minute,
    },
    { disambiguation: 'compatible' },
  );

  return zonedDateTime.toInstant().toString();
};
