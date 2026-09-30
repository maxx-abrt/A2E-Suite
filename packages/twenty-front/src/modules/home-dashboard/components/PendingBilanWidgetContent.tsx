import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type PendingBilanWidgetContentProps = {
  entries: HomeWidgetListEntry[];
  onSelectEntry?: (itemId: string) => void;
};

export const PendingBilanWidgetContent = ({
  entries,
  onSelectEntry,
}: PendingBilanWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-pending-bilan"
      emptyLabel={t`Nothing pending in Bilan`}
      entries={entries}
      onSelectEntry={onSelectEntry}
    />
  );
};
