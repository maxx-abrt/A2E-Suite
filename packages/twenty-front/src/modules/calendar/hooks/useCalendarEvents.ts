import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { CoreObjectNameSingular } from 'twenty-shared/types';

// Reads standard `calendarEvent` rows. The server visibility filter already
// redacts events the caller does not own, so the page only renders what the API
// returns; there is no second event store to merge.
export const useCalendarEvents = () => {
  const { records, loading, error, refetch } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    recordGqlFields: {
      id: true,
      title: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      isFullDay: true,
      isCanceled: true,
    },
    orderBy: [{ startsAt: 'AscNullsLast' }],
    limit: 500,
  });

  return {
    events: records as unknown as CalendarEventRecord[],
    loading,
    error,
    refetch,
  };
};
