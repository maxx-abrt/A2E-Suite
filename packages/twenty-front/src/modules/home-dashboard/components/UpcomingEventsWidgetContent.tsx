import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type UpcomingEventsWidgetContentProps = {
  entries: HomeWidgetListEntry[];
};

export const UpcomingEventsWidgetContent = ({
  entries,
}: UpcomingEventsWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-upcoming-events"
      emptyLabel={t`No upcoming events`}
      entries={entries}
    />
  );
};
