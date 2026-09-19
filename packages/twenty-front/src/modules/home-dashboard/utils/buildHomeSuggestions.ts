import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';

import {
  HOME_TASK_DONE_STATUS,
  isTaskOverdue,
  type HomeTaskSummary,
} from '@/home-dashboard/utils/selectMyTasks';
import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { filterInboxNotificationsByCategory } from '@/inbox/utils/filterInboxNotificationsByCategory';
import { getInboxNotificationPreview } from '@/inbox/utils/getInboxNotificationPreview';
import { resolveNotificationDeepLink } from '@/inbox/utils/resolveNotificationDeepLink';

// Rules-first suggests deterministic thresholds, no ranking model: a task is
// stale once it has gone untouched for this long (overdue tasks use the
// existing `isTaskOverdue` rule instead of a threshold).
export const STALE_TASK_THRESHOLD_DAYS = 7;

export const STALE_TASK_THRESHOLD_MS =
  STALE_TASK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

export type HomeSuggestionKind =
  | 'OVERDUE_TASK'
  | 'STALE_TASK'
  | 'UNREAD_MENTION';

export type HomeSuggestionTask = HomeTaskSummary & {
  updatedAt: string | null;
};

export type HomeSuggestion = {
  id: string;
  kind: HomeSuggestionKind;
  contextLabel: string | null;
  occurredAt: string;
  deepLink: string | null;
  isOverdue: boolean;
};

export type BuildHomeSuggestionsArgs = {
  tasks: HomeSuggestionTask[];
  notifications: InboxNotification[];
  now: Date;
  limit?: number;
};

const buildTaskSuggestion = ({
  task,
  kind,
  occurredAt,
}: {
  task: HomeSuggestionTask;
  kind: Extract<HomeSuggestionKind, 'OVERDUE_TASK' | 'STALE_TASK'>;
  occurredAt: string;
}): HomeSuggestion => ({
  id: `${kind}:${task.id}`,
  kind,
  contextLabel: task.title,
  occurredAt,
  deepLink: getAppPath(AppPath.RecordShowPage, {
    objectNameSingular: CoreObjectNameSingular.Task,
    objectRecordId: task.id,
  }),
  isOverdue: kind === 'OVERDUE_TASK',
});

const buildMentionSuggestion = (
  notification: InboxNotification,
): HomeSuggestion => ({
  id: `UNREAD_MENTION:${notification.id}`,
  kind: 'UNREAD_MENTION',
  contextLabel: getInboxNotificationPreview(notification),
  occurredAt: notification.createdAt,
  deepLink: resolveNotificationDeepLink(notification),
  isOverdue: false,
});

const isStaleTask = (task: HomeSuggestionTask, now: Date): boolean => {
  if (
    task.status === HOME_TASK_DONE_STATUS ||
    isTaskOverdue(task, now) ||
    task.updatedAt === null
  ) {
    return false;
  }

  const updatedAtTime = new Date(task.updatedAt).getTime();
  const age = now.getTime() - updatedAtTime;

  return Number.isFinite(updatedAtTime) && age >= STALE_TASK_THRESHOLD_MS;
};

const compareTimestamps = (first: string, second: string): number =>
  new Date(first).getTime() - new Date(second).getTime();

// Priority order is the rules themselves: overdue tasks first (most overdue
// leading), then stale tasks (oldest touch leading), then unread mentions
// (newest leading). Overdue tasks are excluded from the stale rule so one task
// never produces two cards for the same problem.
export const buildHomeSuggestions = ({
  tasks,
  notifications,
  now,
  limit,
}: BuildHomeSuggestionsArgs): HomeSuggestion[] => {
  const overdueTaskSuggestions = tasks
    .filter((task) => isTaskOverdue(task, now))
    .sort((firstTask, secondTask) =>
      compareTimestamps(firstTask.dueAt ?? '', secondTask.dueAt ?? ''),
    )
    .map((task) =>
      buildTaskSuggestion({
        task,
        kind: 'OVERDUE_TASK',
        occurredAt: task.dueAt ?? '',
      }),
    );

  const staleTaskSuggestions = tasks
    .filter((task) => isStaleTask(task, now))
    .sort((firstTask, secondTask) =>
      compareTimestamps(firstTask.updatedAt ?? '', secondTask.updatedAt ?? ''),
    )
    .map((task) =>
      buildTaskSuggestion({
        task,
        kind: 'STALE_TASK',
        occurredAt: task.updatedAt ?? '',
      }),
    );

  const unreadMentionSuggestions = filterInboxNotificationsByCategory({
    notifications,
    category: 'mentions',
  })
    .filter(
      (notification) =>
        notification.readAt === null && notification.archivedAt === null,
    )
    .sort((firstNotification, secondNotification) =>
      compareTimestamps(
        secondNotification.createdAt,
        firstNotification.createdAt,
      ),
    )
    .map(buildMentionSuggestion);

  const suggestions = [
    ...overdueTaskSuggestions,
    ...staleTaskSuggestions,
    ...unreadMentionSuggestions,
  ];

  return isDefined(limit) ? suggestions.slice(0, limit) : suggestions;
};
