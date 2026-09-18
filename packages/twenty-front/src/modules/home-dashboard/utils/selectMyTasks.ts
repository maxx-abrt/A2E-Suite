export type HomeTaskSummary = {
  id: string;
  title: string;
  status: string | null;
  dueAt: string | null;
};

export const HOME_TASK_DONE_STATUS = 'DONE';

const compareDueDates = (
  firstDueAt: string | null,
  secondDueAt: string | null,
): number => {
  if (firstDueAt === null && secondDueAt === null) {
    return 0;
  }

  if (firstDueAt === null) {
    return 1;
  }

  if (secondDueAt === null) {
    return -1;
  }

  return new Date(firstDueAt).getTime() - new Date(secondDueAt).getTime();
};

export const isTaskOverdue = (task: HomeTaskSummary, now: Date): boolean =>
  task.status !== HOME_TASK_DONE_STATUS &&
  task.dueAt !== null &&
  new Date(task.dueAt).getTime() < now.getTime();

// The My-tasks smart list is a filter over the standard task object, not a
// separate store; the widget only needs the "assigned to me" ordering.
export const selectMyTasks = (
  tasks: HomeTaskSummary[],
  { limit }: { limit: number },
): HomeTaskSummary[] =>
  tasks
    .filter((task) => task.status !== HOME_TASK_DONE_STATUS)
    .sort((firstTask, secondTask) =>
      compareDueDates(firstTask.dueAt, secondTask.dueAt),
    )
    .slice(0, limit);
