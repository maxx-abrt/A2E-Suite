import { Temporal } from 'temporal-polyfill';

import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { buildCalendarEventDraftFromSlot } from '@/calendar/utils/calendarEventSlots';

// A blank event for the Agenda home's primary action. It starts at the next
// full hour in the workspace time zone (never in the past), so "New event" from
// the landing always lands on a slot the user can immediately see in the week.
export const buildDefaultCalendarEventDraft = ({
  timeZone,
}: {
  timeZone: string;
}): CalendarEventDraft => {
  const nextHour = Temporal.Now.zonedDateTimeISO(timeZone).round({
    smallestUnit: 'hour',
    roundingMode: 'ceil',
  });

  return buildCalendarEventDraftFromSlot({
    day: nextHour.toPlainDate(),
    hour: nextHour.hour,
    minute: 0,
  });
};
