import { type Temporal } from 'temporal-polyfill';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';

// A record placed on the calendar: the day range is inclusive, so a single-day
// event has `startDay` equal to `endDay` and a multi-day event spans each day
// in between.
export type CalendarEventSpan = {
  event: CalendarEventRecord;
  isAllDay: boolean;
  startDay: Temporal.PlainDate;
  endDay: Temporal.PlainDate;
};
