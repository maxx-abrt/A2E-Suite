import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useHeadlessCommandContextApi } from '@/command-menu-item/engine-command/hooks/useHeadlessCommandContextApi';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { isDefined } from 'twenty-shared/utils';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { QuickCreateWorkRecordCommand } from '@/command-menu-item/engine-command/record/no-selection/components/QuickCreateWorkRecordCommand';

export const CreateNewIndexRecordNoSelectionRecordCommand = () => {
  const { objectMetadataItem, recordIndexId } = useHeadlessCommandContextApi();

  if (!isDefined(objectMetadataItem) || !isDefined(recordIndexId)) {
    throw new Error(
      'Object metadata item and record index ID are required to create new index record',
    );
  }

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
    instanceId: recordIndexId,
  });

  if (['task', 'project'].includes(objectMetadataItem.nameSingular)) {
    return (
      <QuickCreateWorkRecordCommand
        objectNameSingular={objectMetadataItem.nameSingular}
        onCreate={(title) =>
          createNewIndexRecord(
            {
              position: 'first',
              [getLabelIdentifierFieldMetadataItem(objectMetadataItem)?.name ??
              'name']: title,
            },
            { shouldOpenRecord: false },
          )
        }
      />
    );
  }

  return (
    <HeadlessEngineCommandWrapperEffect
      execute={() => createNewIndexRecord({ position: 'first' })}
    />
  );
};
