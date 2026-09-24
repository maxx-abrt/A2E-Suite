import { Temporal } from 'temporal-polyfill';
import { isDefined, parseToInstantOrThrow } from 'twenty-shared/utils';

import { type CalendarTaskDue } from '@/calendar/types/CalendarTaskDue';
import { type CalendarTaskDueRecord } from '@/calendar/types/CalendarTaskDueRecord';

const TASK_DONE_STATUS = 'DONE';

const compareCalendarTaskDues = (
  taskDueA: CalendarTaskDue & { dueInstant: Temporal.Instant },
  taskDueB: CalendarTaskDue & { dueInstant: Temporal.Instant },
): number => {
  // Open deadlines first; completed ones stay visible but sink to the bottom.
  if (taskDueA.isDone !== taskDueB.isDone) {
    return taskDueA.isDone ? 1 : -1;
  }

  const instantComparison = Temporal.Instant.compare(
    taskDueA.dueInstant,
    taskDueB.dueInstant,
  );

  if (instantComparison !== 0) {
    return instantComparison;
  }

  const titleComparison = (taskDueA.task.title ?? '').localeCompare(
    taskDueB.task.title ?? '',
  );

  return titleComparison !== 0
    ? titleComparison
    : taskDueA.task.id.localeCompare(taskDueB.task.id);
};

// Buckets tasks by the day their due date falls on in the viewer's zone, for
// the visible range only. Tasks without a due date or with an unreadable one
// are skipped (never guessed onto a day).
export const groupCalendarTaskDuesByDay = ({
  tasks,
  timeZone,
  firstDay,
  lastDay,
  today,
}: {
  tasks: CalendarTaskDueRecord[];
  timeZone: string;
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
  today: Temporal.PlainDate;
}): Map<string, CalendarTaskDue[]> => {
  const taskDuesByDay = new Map<
    string,
    (CalendarTaskDue & { dueInstant: Temporal.Instant })[]
  >();
  const seenTaskIds = new Set<string>();

  tasks.forEach((task) => {
    if (!isDefined(task.dueAt) || seenTaskIds.has(task.id)) {
      return;
    }

    let dueInstant: Temporal.Instant;
    let dueDay: Temporal.PlainDate;

    try {
      dueInstant = parseToInstantOrThrow(task.dueAt);
      dueDay = dueInstant.toZonedDateTimeISO(timeZone).toPlainDate();
    } catch {
      return;
    }

    if (
      Temporal.PlainDate.compare(dueDay, firstDay) === -1 ||
      Temporal.PlainDate.compare(dueDay, lastDay) === 1
    ) {
      return;
    }

    seenTaskIds.add(task.id);

    const isDone = task.status === TASK_DONE_STATUS;
    const dayKey = dueDay.toString();
    const dayTaskDues = taskDuesByDay.get(dayKey) ?? [];

    dayTaskDues.push({
      task,
      dueDay,
      dueInstant,
      isDone,
      isOverdue: !isDone && Temporal.PlainDate.compare(dueDay, today) === -1,
    });
    taskDuesByDay.set(dayKey, dayTaskDues);
  });

  const sortedTaskDuesByDay = new Map<string, CalendarTaskDue[]>();

  taskDuesByDay.forEach((dayTaskDues, dayKey) => {
    sortedTaskDuesByDay.set(
      dayKey,
      [...dayTaskDues]
        .sort(compareCalendarTaskDues)
        .map(({ task, dueDay, isDone, isOverdue }) => ({
          task,
          dueDay,
          isDone,
          isOverdue,
        })),
    );
  });

  return sortedTaskDuesByDay;
};
