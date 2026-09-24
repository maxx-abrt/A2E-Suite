import { type Temporal } from 'temporal-polyfill';

import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import { type CalendarRecurrenceFrequency } from '@/calendar/types/CalendarRecurrenceFrequency';
import {
  getCalendarMonthlyPositionForDay,
  getCalendarRecurrenceWeekdayForDay,
} from '@/calendar/utils/getCalendarMonthlyPositionForDay';

const DEFAULT_RECURRENCE_COUNT = 10;

// A fresh "Repeat" choice is anchored on the event's start day: weekly repeats
// on that weekday, monthly on that day of the month, open-ended.
export const buildDefaultCalendarRecurrenceDraft = ({
  frequency,
  startDay,
}: {
  frequency: CalendarRecurrenceFrequency;
  startDay: Temporal.PlainDate;
}): CalendarRecurrenceDraft => ({
  frequency,
  interval: 1,
  byWeekdays: [getCalendarRecurrenceWeekdayForDay(startDay)],
  monthlyMode: 'day-of-month',
  monthlyPosition: getCalendarMonthlyPositionForDay(startDay),
  endMode: 'never',
  count: DEFAULT_RECURRENCE_COUNT,
  untilDay: startDay.add({ months: 3 }),
});
