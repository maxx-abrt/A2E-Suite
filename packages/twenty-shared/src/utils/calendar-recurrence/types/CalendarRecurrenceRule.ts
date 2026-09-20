import { type CalendarRecurrenceFrequency } from './CalendarRecurrenceFrequency';
import { type CalendarRecurrenceMonthlyPosition } from './CalendarRecurrenceMonthlyPosition';
import { type CalendarRecurrenceWeekday } from './CalendarRecurrenceWeekday';

// Pure, provider-independent recurrence rule. `until` is an inclusive ISO-8601
// instant and is mutually exclusive with `count` (both null = open-ended).
// `byWeekdays` and `monthlyPosition` are alternative monthly selectors; a rule
// must not carry both. Daily rules ignore both.
export type CalendarRecurrenceRule = {
  frequency: CalendarRecurrenceFrequency;
  interval: number;
  byWeekdays: CalendarRecurrenceWeekday[];
  monthlyPosition: CalendarRecurrenceMonthlyPosition | null;
  count: number | null;
  until: string | null;
};
