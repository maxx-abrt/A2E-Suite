import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { RecordQuickCreateModal } from '@/object-record/record-create/components/RecordQuickCreateModal';
import { getLabelIdentifierFieldMetadataItem } from '@/object-metadata/utils/getLabelIdentifierFieldMetadataItem';
import { hasAnySoftDeleteFilterOnViewComponentSelector } from '@/object-record/record-filter/states/hasAnySoftDeleteFilterOnView';
import { useRecordTableContextOrThrow } from '@/object-record/record-table/contexts/RecordTableContext';
import { useCreateNewIndexRecord } from '@/object-record/record-table/hooks/useCreateNewIndexRecord';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { IconPlus } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { LightIconButton } from 'twenty-ui/input';
import { useIsMobile } from 'twenty-ui/utilities';
import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';

const StyledHeaderIcon = styled.div`
  margin: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[1]}
    ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing['1.5']};
`;

export const RecordTableHeaderLabelIdentifierCellPlusButton = () => {
  const { objectMetadataItem, objectPermissions, recordTableId } =
    useRecordTableContextOrThrow();

  const isMobile = useIsMobile();
  const { t } = useLingui();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  const { createNewIndexRecord } = useCreateNewIndexRecord({
    objectMetadataItem,
  });

  const handlePlusButtonClick = () => {
    if (['task', 'project'].includes(objectMetadataItem.nameSingular)) {
      setIsQuickCreateOpen(true);
      return;
    }
    createNewIndexRecord({
      position: 'first',
    });
  };

  const hasAnySoftDeleteFilterOnView = useAtomComponentSelectorValue(
    hasAnySoftDeleteFilterOnViewComponentSelector,
  );

  return (
    !isMobile &&
    !isLayoutCustomizationModeEnabled &&
    !hasAnySoftDeleteFilterOnView &&
    canCreateRecordsForObjectMetadataItem({
      objectPermissions,
      objectMetadataItem,
    }) && (
      <StyledHeaderIcon>
        <LightIconButton
          Icon={IconPlus}
          size="small"
          accent="tertiary"
          onClick={handlePlusButtonClick}
          aria-label={t`New ${objectMetadataItem.labelSingular}`}
        />
        {isQuickCreateOpen && (
          <RecordQuickCreateModal
            modalId={`${recordTableId}-quick-create`}
            objectNameSingular={objectMetadataItem.nameSingular}
            onClose={() => setIsQuickCreateOpen(false)}
            onCreate={(title) =>
              createNewIndexRecord(
                {
                  position: 'first',
                  [getLabelIdentifierFieldMetadataItem(objectMetadataItem)
                    ?.name ?? 'name']: title,
                },
                { shouldOpenRecord: false },
              )
            }
          />
        )}
      </StyledHeaderIcon>
    )
  );
};
