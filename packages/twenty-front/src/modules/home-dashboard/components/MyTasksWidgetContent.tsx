import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type MyTasksWidgetContentProps = {
  entries: HomeWidgetListEntry[];
};

export const MyTasksWidgetContent = ({
  entries,
}: MyTasksWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-my-tasks"
      emptyLabel={t`No tasks assigned to you`}
      entries={entries}
    />
  );
};
