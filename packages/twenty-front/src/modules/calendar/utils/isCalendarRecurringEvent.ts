import { isNonEmptyString } from '@sniptt/guards';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// An event carries recurrence series state when any of the three identity
// columns is set: the anchor has a rule (+ series id), a detached occurrence
// shares the series id and names its day. A plain local event leaves all null
// and is edited/deleted directly, without the this-occurrence/whole-series
// dialog.
export const isCalendarRecurringEvent = (event: CalendarEventRecord): boolean =>
  isNonEmptyString(event.recurrenceRule) ||
  isNonEmptyString(event.recurrenceSeriesId) ||
  isNonEmptyString(event.recurrenceOccurrenceDay);
