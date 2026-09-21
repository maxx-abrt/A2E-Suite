import { isDefined } from 'twenty-shared/utils';

import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// Record -> write shape for the detached-occurrence payload. Returns null when
// the row has no start instant, because a detached occurrence must be a real
// event; a rule-less, start-less row is not one.
export const buildCalendarEventInputFromRecord = (
  event: CalendarEventRecord,
): CalendarEventInput | null => {
  if (!isDefined(event.startsAt)) {
    return null;
  }

  return {
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt ?? event.startsAt,
    isFullDay: event.isFullDay,
    isCanceled: event.isCanceled,
  };
};
