import { isNonEmptyString } from '@sniptt/guards';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';

// The series an event belongs to. An anchor written before its series id was
// stamped still owns the derived id, which is exactly the id its detached
// siblings were written with, so both sides of the series resolve the same way.
export const getCalendarEventSeriesId = (
  event: CalendarEventRecord,
): string | null => {
  if (isNonEmptyString(event.recurrenceSeriesId)) {
    return event.recurrenceSeriesId;
  }

  if (
    isNonEmptyString(event.recurrenceRule) &&
    !isNonEmptyString(event.recurrenceOccurrenceDay)
  ) {
    return buildCalendarSeriesId({ seriesAnchorEventId: event.id });
  }

  return null;
};
