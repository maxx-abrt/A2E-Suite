// A standard `task` read for the due-date overlay. A deadline is not an event:
// the overlay only reads, and the task stays the single source of truth (C5).
export type CalendarTaskDueRecord = {
  id: string;
  title: string | null;
  dueAt: string | null;
  status: string | null;
};
