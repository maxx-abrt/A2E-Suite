import { type Temporal } from 'temporal-polyfill';
import { CALENDAR_RECURRENCE_WEEKDAYS } from 'twenty-shared/utils';

import { type CalendarRecurrenceMonthlyPosition } from '@/calendar/types/CalendarRecurrenceMonthlyPosition';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';

export const getCalendarRecurrenceWeekdayForDay = (
  day: Temporal.PlainDate,
): CalendarRecurrenceWeekday => CALENDAR_RECURRENCE_WEEKDAYS[day.dayOfWeek - 1];

// "Second Tuesday" for the 9th of a month starting on a Monday. The model only
// allows ordinals 1..4 and -1, so a fifth weekday (29th..31st) becomes "last".
export const getCalendarMonthlyPositionForDay = (
  day: Temporal.PlainDate,
): CalendarRecurrenceMonthlyPosition => {
  const ordinal = Math.ceil(day.day / 7);

  return {
    weekday: getCalendarRecurrenceWeekdayForDay(day),
    ordinal: ordinal > 4 ? -1 : ordinal,
  };
};
