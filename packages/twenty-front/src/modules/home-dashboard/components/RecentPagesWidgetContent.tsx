import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type RecentPagesWidgetContentProps = {
  entries: HomeWidgetListEntry[];
  onSelectEntry?: (pageId: string) => void;
};

export const RecentPagesWidgetContent = ({
  entries,
  onSelectEntry,
}: RecentPagesWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-recent-pages"
      emptyLabel={t`No recent pages`}
      entries={entries}
      onSelectEntry={onSelectEntry}
    />
  );
};
