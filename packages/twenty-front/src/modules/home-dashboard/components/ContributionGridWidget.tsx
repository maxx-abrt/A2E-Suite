import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { ContributionGridWidgetContent } from '@/home-dashboard/components/ContributionGridWidgetContent';
import { buildContributionGrid } from '@/home-dashboard/utils/buildContributionGrid';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const CONTRIBUTION_GRID_WEEK_COUNT = 12;
const CONTRIBUTION_GRID_ACTIVITY_LIMIT = 500;

type HomeContributionActivityRecord = {
  id: string;
  happensAt: string;
};

export const ContributionGridWidget = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspaceMemberId = currentWorkspaceMember?.id;

  const { records } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.TimelineActivity,
    filter: isDefined(workspaceMemberId)
      ? { workspaceMemberId: { eq: workspaceMemberId } }
      : undefined,
    orderBy: [{ happensAt: 'DescNullsFirst' }],
    limit: CONTRIBUTION_GRID_ACTIVITY_LIMIT,
    skip: !isDefined(workspaceMemberId),
    recordGqlFields: { id: true, happensAt: true },
  });

  const weeks = buildContributionGrid({
    activityTimestamps: (
      records as unknown as HomeContributionActivityRecord[]
    ).map((activity) => activity.happensAt),
    today: new Date(),
    weekCount: CONTRIBUTION_GRID_WEEK_COUNT,
  });

  return <ContributionGridWidgetContent weeks={weeks} />;
};
