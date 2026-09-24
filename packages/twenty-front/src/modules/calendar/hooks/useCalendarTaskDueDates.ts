import { type Temporal } from 'temporal-polyfill';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { type CalendarTaskDueRecord } from '@/calendar/types/CalendarTaskDueRecord';
import { getCalendarTaskDueQueryRange } from '@/calendar/utils/getCalendarTaskDueQueryRange';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

// Reads standard `task` rows whose due date falls in the visible range. Works
// without the Projects app (dueAt is a standard field); the query is skipped
// when the overlay is hidden or the member cannot read tasks.
export const useCalendarTaskDueDates = ({
  firstDay,
  lastDay,
  timeZone,
  skip,
}: {
  firstDay: Temporal.PlainDate;
  lastDay: Temporal.PlainDate;
  timeZone: string;
  skip: boolean;
}) => {
  const { dueAtFrom, dueAtBefore } = getCalendarTaskDueQueryRange({
    firstDay,
    lastDay,
    timeZone,
  });

  const { records, loading, error, refetch } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.Task,
    filter: {
      and: [{ dueAt: { gte: dueAtFrom } }, { dueAt: { lt: dueAtBefore } }],
    },
    recordGqlFields: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
    },
    orderBy: [{ dueAt: 'AscNullsLast' }],
    limit: 500,
    skip,
  });

  return {
    tasks: skip ? [] : (records as unknown as CalendarTaskDueRecord[]),
    loading: skip ? false : loading,
    error: skip ? undefined : error,
    refetch,
  };
};
