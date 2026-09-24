import { useCallback, useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';

import { type CalendarQuickTaskInput } from '@/calendar/utils/buildCalendarQuickTaskInput';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';

// Creates a standard `task` from a calendar day through the native record path
// (same row the Tasks tab, My tasks and Projects read). Never creates an event.
export const useCalendarTaskQuickCreate = () => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Task,
  });
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );
  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.Task,
    recordGqlFields: { id: true, title: true, dueAt: true, status: true },
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTask = useCallback(
    async (input: CalendarQuickTaskInput): Promise<boolean> => {
      setIsCreating(true);
      setError(null);

      try {
        await createOneRecord({ ...input });

        return true;
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError
            : new Error(String(caughtError)),
        );

        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [createOneRecord],
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    canCreateTasks: objectPermissions.canUpdateObjectRecords === true,
    createTask,
    isCreating,
    error,
    resetError,
  };
};
