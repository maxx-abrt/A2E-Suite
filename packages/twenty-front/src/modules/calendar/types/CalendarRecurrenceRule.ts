import { type CalendarRecurrenceFrequency } from '@/calendar/types/CalendarRecurrenceFrequency';
import { type CalendarRecurrenceMonthlyPosition } from '@/calendar/types/CalendarRecurrenceMonthlyPosition';
import { type CalendarRecurrenceWeekday } from '@/calendar/types/CalendarRecurrenceWeekday';

// Pure, provider-independent recurrence rule. `until` is an inclusive ISO-8601
// instant and is mutually exclusive with `count` (both null = open-ended).
// `byWeekdays` and `monthlyPosition` are alternative monthly selectors; a rule
// must not carry both. Daily rules ignore both. Nothing here is persisted yet:
// P4C.3a owns the model, expansion and parsing only.
export type CalendarRecurrenceRule = {
  frequency: CalendarRecurrenceFrequency;
  interval: number;
  byWeekdays: CalendarRecurrenceWeekday[];
  monthlyPosition: CalendarRecurrenceMonthlyPosition | null;
  count: number | null;
  until: string | null;
};
