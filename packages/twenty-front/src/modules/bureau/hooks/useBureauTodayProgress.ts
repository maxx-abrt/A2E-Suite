import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { AggregateOperations } from '@/object-record/record-table/constants/AggregateOperations';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useBureauDayBoundaries } from '@/bureau/hooks/useBureauDayBoundaries';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const COUNT_FIELDS = { id: [AggregateOperations.COUNT] };

export const useBureauTodayProgress = () => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Task,
  });
  const { today, tomorrow } = useBureauDayBoundaries();

  const filter = {
    assigneeId: { eq: currentWorkspaceMember?.id },
    and: [
      { dueAt: { gte: today.toInstant().toString() } },
      { dueAt: { lt: tomorrow.toInstant().toString() } },
    ],
  };
  const skip = !isDefined(currentWorkspaceMember?.id);
  const total = useAggregateRecords({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFieldsAggregate: COUNT_FIELDS,
    filter,
    skip,
  });
  const completed = useAggregateRecords({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFieldsAggregate: COUNT_FIELDS,
    // Projects reads its pipeline first, falling back to native status when unset.
    filter: objectMetadataItem.readableFields.some(
      (field) => field.name === 'projectStatus',
    )
      ? {
          ...filter,
          or: [
            { projectStatus: { eq: 'DONE' } },
            {
              and: [
                { projectStatus: { is: 'NULL' } },
                { status: { eq: 'DONE' } },
              ],
            },
          ],
        }
      : { ...filter, status: { eq: 'DONE' } },
    skip,
  });

  const totalCount = total.data.id?.COUNT;
  const completedCount = completed.data.id?.COUNT;

  return {
    totalCount: isDefined(totalCount) ? Number(totalCount) : undefined,
    completedCount: isDefined(completedCount)
      ? Number(completedCount)
      : undefined,
    isLoading: skip || total.loading || completed.loading,
    hasError: isDefined(total.error) || isDefined(completed.error),
  };
};
