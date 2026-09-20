import { useCallback, useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useDeleteOneRecord } from '@/object-record/hooks/useDeleteOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';

const CALENDAR_EVENT_GQL_FIELDS = {
  id: true,
  title: true,
  description: true,
  location: true,
  startsAt: true,
  endsAt: true,
  isFullDay: true,
  isCanceled: true,
  externalCreatedAt: true,
};

// Front create/update/delete over the standard `calendarEvent` record path. No
// provider mutation is touched: a local save never sends an invitation (P4C.5
// boundary). Callers gate update/delete on isLocalCalendarEvent.
export const useCalendarEventMutations = () => {
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
    recordGqlFields: CALENDAR_EVENT_GQL_FIELDS,
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const { deleteOneRecord } = useDeleteOneRecord({
    objectNameSingular: CoreObjectNameSingular.CalendarEvent,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const runMutation = useCallback(
    async (mutation: () => Promise<unknown>): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      try {
        await mutation();

        return true;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError)),
        );

        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const createCalendarEvent = useCallback(
    (input: CalendarEventInput) =>
      runMutation(() => createOneRecord({ ...input })),
    [createOneRecord, runMutation],
  );

  const updateCalendarEvent = useCallback(
    ({ id, input }: { id: string; input: Partial<CalendarEventInput> }) =>
      runMutation(() =>
        updateOneRecord({
          objectNameSingular: CoreObjectNameSingular.CalendarEvent,
          idToUpdate: id,
          updateOneRecordInput: input,
          recordGqlFields: CALENDAR_EVENT_GQL_FIELDS,
        }),
      ),
    [runMutation, updateOneRecord],
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => runMutation(() => deleteOneRecord(id)),
    [deleteOneRecord, runMutation],
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    isSaving,
    error,
    resetError,
  };
};
