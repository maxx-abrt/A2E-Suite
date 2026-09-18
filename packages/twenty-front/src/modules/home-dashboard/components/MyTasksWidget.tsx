import { useLingui } from '@lingui/react/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { MyTasksWidgetContent } from '@/home-dashboard/components/MyTasksWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import {
  type HomeTaskSummary,
  HOME_TASK_DONE_STATUS,
  isTaskOverdue,
  selectMyTasks,
} from '@/home-dashboard/utils/selectMyTasks';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const MY_TASKS_WIDGET_LIMIT = 8;

export const MyTasksWidget = () => {
  const { t } = useLingui();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspaceMemberId = currentWorkspaceMember?.id;
  const now = new Date();

  const { records } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.Task,
    filter: isDefined(workspaceMemberId)
      ? {
          assigneeId: { eq: workspaceMemberId },
          status: { neq: HOME_TASK_DONE_STATUS },
        }
      : undefined,
    orderBy: [{ dueAt: 'AscNullsLast' }],
    limit: MY_TASKS_WIDGET_LIMIT,
    skip: !isDefined(workspaceMemberId),
    recordGqlFields: { id: true, title: true, status: true, dueAt: true },
  });

  const tasks = selectMyTasks(records as unknown as HomeTaskSummary[], {
    limit: MY_TASKS_WIDGET_LIMIT,
  });

  const entries: HomeWidgetListEntry[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    subtitle:
      task.dueAt !== null
        ? formatHomeWidgetDayLabel(task.dueAt)
        : t`No due date`,
    trailingLabel: isTaskOverdue(task, now) ? t`Overdue` : undefined,
    isOverdue: isTaskOverdue(task, now),
  }));

  return <MyTasksWidgetContent entries={entries} />;
};
