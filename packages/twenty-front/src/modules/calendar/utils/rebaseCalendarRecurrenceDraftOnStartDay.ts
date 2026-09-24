import { type Temporal } from 'temporal-polyfill';

import { type CalendarRecurrenceDraft } from '@/calendar/types/CalendarRecurrenceDraft';
import {
  getCalendarMonthlyPositionForDay,
  getCalendarRecurrenceWeekdayForDay,
} from '@/calendar/utils/getCalendarMonthlyPositionForDay';

// Moving the event's start day keeps an untouched default meaningful: a weekly
// rule that only repeated on the old start weekday follows the new weekday, and
// a "second Tuesday" rule follows the new day's position. Weekday sets the user
// customised are left alone.
export const rebaseCalendarRecurrenceDraftOnStartDay = ({
  recurrence,
  previousStartDay,
  nextStartDay,
}: {
  recurrence: CalendarRecurrenceDraft;
  previousStartDay: Temporal.PlainDate;
  nextStartDay: Temporal.PlainDate;
}): CalendarRecurrenceDraft => {
  const previousWeekday = getCalendarRecurrenceWeekdayForDay(previousStartDay);
  const isDefaultWeekdaySelection =
    recurrence.byWeekdays.length === 1 &&
    recurrence.byWeekdays[0] === previousWeekday;

  return {
    ...recurrence,
    byWeekdays: isDefaultWeekdaySelection
      ? [getCalendarRecurrenceWeekdayForDay(nextStartDay)]
      : recurrence.byWeekdays,
    monthlyPosition:
      recurrence.monthlyMode === 'weekday-position'
        ? getCalendarMonthlyPositionForDay(nextStartDay)
        : recurrence.monthlyPosition,
  };
};
