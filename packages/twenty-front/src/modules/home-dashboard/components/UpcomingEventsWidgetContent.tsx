import { useLingui } from '@lingui/react/macro';

import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

export type UpcomingEventsWidgetContentProps = {
  entries: HomeWidgetListEntry[];
  onSelectEntry?: (calendarEventId: string) => void;
};

export const UpcomingEventsWidgetContent = ({
  entries,
  onSelectEntry,
}: UpcomingEventsWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <HomeWidgetList
      testId="home-upcoming-events"
      emptyLabel={t`No upcoming events`}
      entries={entries}
      onSelectEntry={onSelectEntry}
    />
  );
};
