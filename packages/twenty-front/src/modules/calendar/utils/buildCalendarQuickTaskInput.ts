import { Temporal } from 'temporal-polyfill';

export type CalendarQuickTaskInput = {
  id: string;
  title: string;
  dueAt: string;
  status: 'TODO';
};

// Local noon keeps the deadline on the chosen day for the author and for any
// teammate within ±11h of them; midnight would slip a day for anyone west.
const QUICK_TASK_DUE_TIME = Temporal.PlainTime.from('12:00');

// Input for a standard `task` created from a calendar day. Returns null for a
// blank title so the dialog never creates an untitled record by accident.
export const buildCalendarQuickTaskInput = ({
  taskId,
  title,
  dueDay,
  timeZone,
}: {
  taskId: string;
  title: string;
  dueDay: Temporal.PlainDate;
  timeZone: string;
}): CalendarQuickTaskInput | null => {
  const trimmedTitle = title.trim();

  if (trimmedTitle.length === 0) {
    return null;
  }

  return {
    id: taskId,
    title: trimmedTitle,
    dueAt: dueDay
      .toZonedDateTime({ timeZone, plainTime: QUICK_TASK_DUE_TIME })
      .toInstant()
      .toString(),
    status: 'TODO',
  };
};
