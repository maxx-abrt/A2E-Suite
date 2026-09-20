import { isDefined } from 'twenty-shared/utils';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// D5.4 read-back-only boundary: provider-synced rows carry external timestamps,
// local rows do not. Only local rows are offered edit/delete.
export const isLocalCalendarEvent = (event: CalendarEventRecord): boolean =>
  !isDefined(event.externalCreatedAt);
