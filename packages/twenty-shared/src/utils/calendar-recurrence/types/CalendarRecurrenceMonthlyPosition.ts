import { type CalendarRecurrenceWeekday } from './CalendarRecurrenceWeekday';

// "second Tuesday" / "last Friday". `ordinal` is 1..4 for the first through
// fourth weekday of the month and -1 for the last one; 0 is invalid.
export type CalendarRecurrenceMonthlyPosition = {
  weekday: CalendarRecurrenceWeekday;
  ordinal: number;
};
