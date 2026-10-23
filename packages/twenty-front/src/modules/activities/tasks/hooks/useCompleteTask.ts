import { useCallback } from 'react';

import { type Task } from '@/activities/types/Task';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useIsRecordFieldReadOnly } from '@/object-record/read-only/hooks/useIsRecordFieldReadOnly';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { isDefined } from 'twenty-shared/utils';

export const useCompleteTask = (
  task: Pick<Task, 'id'> & Partial<Pick<Task, 'status'>>,
) => {
  const { updateOneRecord } = useUpdateOneRecord();
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: CoreObjectNameSingular.Task,
  });
  const statusField = objectMetadataItem.readableFields.find(
    (field) => field.name === 'status',
  );
  const projectStatusField = objectMetadataItem.readableFields.find(
    (field) => field.name === 'projectStatus',
  );
  const isStatusReadOnly = useIsRecordFieldReadOnly({
    recordId: task.id,
    objectMetadataId: objectMetadataItem.id,
    fieldMetadataId: statusField?.id ?? '',
  });
  const isProjectStatusReadOnly = useIsRecordFieldReadOnly({
    recordId: task.id,
    objectMetadataId: objectMetadataItem.id,
    fieldMetadataId: projectStatusField?.id ?? '',
  });
  const storedStatus = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId: task.id,
    fieldName: 'status',
  });
  const storedProjectStatus = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    { recordId: task.id, fieldName: 'projectStatus' },
  );
  const effectiveStatus =
    (isDefined(projectStatusField) ? storedProjectStatus : undefined) ??
    storedStatus ??
    task.status;
  const canCompleteTask =
    isDefined(statusField) &&
    !isStatusReadOnly &&
    (!isDefined(projectStatusField) || !isProjectStatusReadOnly) &&
    isDefined(effectiveStatus);

  const completeTask = useCallback(
    async (value: boolean) => {
      if (!canCompleteTask) return;
      const status = value ? 'DONE' : 'TODO';
      await updateOneRecord({
        objectNameSingular: CoreObjectNameSingular.Task,
        idToUpdate: task.id,
        updateOneRecordInput: {
          status,
          ...(isDefined(projectStatusField) ? { projectStatus: status } : {}),
        },
        recordGqlFields: {
          id: true,
          status: true,
          ...(isDefined(projectStatusField) ? { projectStatus: true } : {}),
        },
      });
    },
    [task.id, updateOneRecord, canCompleteTask, projectStatusField],
  );

  return {
    completeTask,
    canCompleteTask,
    isCompleted: effectiveStatus === 'DONE',
  };
};
