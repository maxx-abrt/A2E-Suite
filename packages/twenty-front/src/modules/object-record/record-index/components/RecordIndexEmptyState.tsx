import { A2eContextualEmptyState } from '@/a2e-empty-state/components/A2eContextualEmptyState';
import { useA2eRecordIndexSurfaceKey } from '@/a2e-empty-state/hooks/useA2eRecordIndexSurfaceKey';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { useObjectLabel } from '@/object-metadata/hooks/useObjectLabel';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { RecordIndexEmptyStateDisplay } from '@/object-record/record-index/components/RecordIndexEmptyStateDisplay';
import { getEmptyStateSubTitle } from '@/object-record/record-table/empty-state/utils/getEmptyStateSubTitle';
import { getEmptyStateTitle } from '@/object-record/record-table/empty-state/utils/getEmptyStateTitle';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconFilterOff, IconPlus, IconSettings } from 'twenty-ui/icon';
import {
  type ObjectPermission,
  EngineComponentKey,
} from '~/generated-metadata/graphql';
import { useMountCommand } from '@/command-menu-item/engine-command/hooks/useMountCommand';
import { useContextStoreInstanceId } from '@/context-store/hooks/useContextStoreInstanceId';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';

type RecordIndexEmptyStateProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  objectPermissions: ObjectPermission;
  isSoftDeleteFilterActive: boolean;
  onRemoveSoftDeleteFilter?: () => void;
  onGoToSettings?: () => void;
  width?: number;
};

export const RecordIndexEmptyState = ({
  objectMetadataItem,
  objectPermissions,
  isSoftDeleteFilterActive,
  onRemoveSoftDeleteFilter,
  onGoToSettings,
  width,
}: RecordIndexEmptyStateProps) => {
  const { t } = useLingui();
  const mountCommand = useMountCommand();
  const contextStoreInstanceId = useContextStoreInstanceId();
  const { recordIndexId } = useRecordIndexContextOrThrow();

  const objectLabelSingular = useObjectLabel(objectMetadataItem);

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const { totalCount } = useFindManyRecords({
    objectNameSingular: objectMetadataItem.nameSingular,
    limit: 1,
  });

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const canCreateRecords =
    !isLayoutCustomizationModeEnabled &&
    !hasAnySoftDeleteFilterOnView &&
    canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    });

  const handleAddRecordClick = canCreateRecords
    ? () => {
        if (['task', 'project'].includes(objectMetadataItem.nameSingular)) {
          void mountCommand({
            engineCommandId: `quick-create-${recordIndexId}`,
            contextStoreInstanceId,
            engineComponentKey: EngineComponentKey.CREATE_NEW_RECORD,
            recordIndexId,
          });
          return;
        }
        createNewIndexRecord();
      }
    : undefined;

  // A2E objects (document, task) get the M13c four-element contextual empty
  // state; every other object falls through to the host state unchanged.
  const a2eSurfaceKey = useA2eRecordIndexSurfaceKey(
    objectMetadataItem.nameSingular,
  );

  if (!objectPermissions.canUpdateObjectRecords) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={t`No records found`}
        subTitle={t`You are not allowed to create records for this object`}
        width={width}
      />
    );
  }

  if (objectMetadataItem.isRemote) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={t`No Data Available for Remote Table`}
        subTitle={t`If this is unexpected, please verify your settings.`}
        ButtonIcon={IconSettings}
        buttonTitle={t`Go to Settings`}
        onButtonClick={onGoToSettings}
        width={width}
      />
    );
  }

  if (isSoftDeleteFilterActive) {
    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noDeletedRecord"
        title={t`No Deleted ${objectLabelSingular} found`}
        subTitle={t`No deleted records matching the filter criteria were found.`}
        ButtonIcon={IconFilterOff}
        buttonTitle={t`Remove Deleted filter`}
        onButtonClick={onRemoveSoftDeleteFilter}
        width={width}
      />
    );
  }

  if (totalCount === 0) {
    if (isDefined(a2eSurfaceKey) && isDefined(handleAddRecordClick)) {
      return (
        <A2eContextualEmptyState
          surfaceKey={a2eSurfaceKey}
          onPrimaryAction={handleAddRecordClick}
          width={width}
        />
      );
    }

    return (
      <RecordIndexEmptyStateDisplay
        animatedPlaceholderType="noRecord"
        title={getEmptyStateTitle(
          objectMetadataItem.nameSingular,
          objectLabelSingular,
        )}
        subTitle={getEmptyStateSubTitle(
          objectMetadataItem.nameSingular,
          objectLabelSingular,
        )}
        ButtonIcon={IconPlus}
        buttonTitle={t`Add a ${objectLabelSingular}`}
        onButtonClick={handleAddRecordClick}
        width={width}
      />
    );
  }

  return (
    <RecordIndexEmptyStateDisplay
      animatedPlaceholderType="noMatchRecord"
      title={t`No ${objectLabelSingular} found`}
      subTitle={t`No records matching the filter criteria were found.`}
      ButtonIcon={IconPlus}
      buttonTitle={t`Add a ${objectLabelSingular}`}
      onButtonClick={handleAddRecordClick}
      width={width}
    />
  );
};
