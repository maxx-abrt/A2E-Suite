import { useLingui } from '@lingui/react/macro';
import { type TimelineActivityAction } from 'twenty-shared/timeline';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { RecentActivityWidgetContent } from '@/home-dashboard/components/RecentActivityWidgetContent';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';
import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import { summarizeTimelineActivity } from '@/home-dashboard/utils/summarizeTimelineActivity';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

const RECENT_ACTIVITY_WIDGET_LIMIT = 8;

type HomeTimelineActivityRecord = {
  id: string;
  name: string | null;
  happensAt: string;
  workspaceMember?: {
    name?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

export const RecentActivityWidget = () => {
  const { t } = useLingui();

  const { records } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.TimelineActivity,
    orderBy: [{ happensAt: 'DescNullsFirst' }],
    limit: RECENT_ACTIVITY_WIDGET_LIMIT,
    recordGqlFields: {
      id: true,
      name: true,
      happensAt: true,
      workspaceMember: { id: true, name: { firstName: true, lastName: true } },
    },
  });

  const getActionLabel = (action: TimelineActivityAction): string => {
    switch (action) {
      case 'created':
        return t`Created`;
      case 'updated':
        return t`Updated`;
      case 'deleted':
        return t`Deleted`;
      case 'restored':
        return t`Restored`;
      case 'linked':
        return t`Linked`;
      case 'unlinked':
        return t`Unlinked`;
    }
  };

  const entries: HomeWidgetListEntry[] = (
    records as unknown as HomeTimelineActivityRecord[]
  ).map((activity) => {
    const { objectNameSingular, action } = summarizeTimelineActivity(
      activity.name,
    );
    const authorName = [
      activity.workspaceMember?.name?.firstName,
      activity.workspaceMember?.name?.lastName,
    ]
      .filter((namePart): namePart is string => typeof namePart === 'string')
      .join(' ');

    return {
      id: activity.id,
      title: `${getActionLabel(action)} ${objectNameSingular ?? t`record`}`,
      subtitle: authorName.length > 0 ? authorName : undefined,
      trailingLabel: formatHomeWidgetDayLabel(activity.happensAt),
    };
  });

  return <RecentActivityWidgetContent entries={entries} />;
};
