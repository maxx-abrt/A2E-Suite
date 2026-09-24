import { type Temporal } from 'temporal-polyfill';

import { type CalendarTaskDueRecord } from '@/calendar/types/CalendarTaskDueRecord';

// A task placed on the calendar day its due date falls on, in the viewer's
// time zone — the same day the task field shows everywhere else.
export type CalendarTaskDue = {
  task: CalendarTaskDueRecord;
  dueDay: Temporal.PlainDate;
  isDone: boolean;
  isOverdue: boolean;
};
