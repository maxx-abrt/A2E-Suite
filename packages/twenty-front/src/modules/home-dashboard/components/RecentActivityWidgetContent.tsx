import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type RecentActivityWidgetContentProps = {
  entries: HomeWidgetListEntry[];
};

export const RecentActivityWidgetContent = ({
  entries,
}: RecentActivityWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-recent-activity"
      emptyLabel={t`No recent activity`}
      entries={entries}
    />
  );
};
