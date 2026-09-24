import { type Temporal } from 'temporal-polyfill';

import { type CalendarRecurrenceFrequency } from '@/calendar/types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceMonthlyPosition } from '@/calendar/types/CalendarRecurrenceMonthlyPosition';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';

export type CalendarRecurrenceMonthlyMode =
  | 'day-of-month'
  | 'weekday-position'
  | 'weekdays';

export type CalendarRecurrenceEndMode = 'never' | 'count' | 'until';

// Editable form state behind the "Repeat" controls. It keeps every field the
// user may toggle back to (count and until day both survive switching the end
// mode) and is only turned into a CalendarRecurrenceRule on save, where the
// series time zone is known.
export type CalendarRecurrenceDraft = {
  frequency: CalendarRecurrenceFrequency;
  interval: number;
  byWeekdays: CalendarRecurrenceWeekday[];
  monthlyMode: CalendarRecurrenceMonthlyMode;
  monthlyPosition: CalendarRecurrenceMonthlyPosition | null;
  endMode: CalendarRecurrenceEndMode;
  count: number;
  untilDay: Temporal.PlainDate;
};
