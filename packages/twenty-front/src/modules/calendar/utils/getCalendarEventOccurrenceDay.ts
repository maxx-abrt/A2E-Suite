import { isNonEmptyString } from '@sniptt/guards';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// The wall-clock day an event's scope dialog acts on. A detached occurrence
// names it explicitly; a series anchor uses the day of its DTSTART in the
// series time zone, which is the occurrence id the engine derives. Keeping the
// day (not the instant) preserves identity across a DST shift.
export const getCalendarEventOccurrenceDay = ({
  event,
  timeZone,
}: {
  event: CalendarEventRecord;
  timeZone: string;
}): string | null => {
  if (isNonEmptyString(event.recurrenceOccurrenceDay)) {
    return event.recurrenceOccurrenceDay;
  }

  if (!isDefined(event.startsAt)) {
    return null;
  }

  if (event.isFullDay) {
    return event.startsAt.slice(0, 10);
  }

  try {
    const effectiveTimeZone = isNonEmptyString(event.recurrenceTimezone)
      ? event.recurrenceTimezone
      : timeZone;

    return parseToInstantOrThrow(event.startsAt)
      .toZonedDateTimeISO(effectiveTimeZone)
      .toPlainDate()
      .toString();
  } catch {
    return null;
  }
};
