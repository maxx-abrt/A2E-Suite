import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';

// "second Tuesday" / "last Friday". `ordinal` is 1..4 for the first through
// fourth weekday of the month and -1 for the last one; 0 is invalid. Monthly
// expansion is not implemented yet (P4C.3b); this is the model only.
export type CalendarRecurrenceMonthlyPosition = {
  weekday: CalendarRecurrenceWeekday;
  ordinal: number;
};
