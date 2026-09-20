import { type Temporal } from 'temporal-polyfill';

// A minute-precision position on the calendar in the user's time zone. Slots are
// the unit shared by the grid, drag-to-create and the keyboard selection, so the
// timezone conversion stays in one place (see buildCalendarEventInstant).
export type CalendarEventSlot = {
  day: Temporal.PlainDate;
  hour: number;
  minute: number;
};
