import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconChevronLeft, IconDatabase } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { MenuItem } from 'twenty-ui/navigation';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { RECORD_VIEW_EMBED_PICKER_DROPDOWN_ID } from '@/blocknote-editor/constants/RecordViewEmbedPickerDropdownId';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { DropdownMenuSectionLabel } from '@/ui/layout/dropdown/components/DropdownMenuSectionLabel';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { viewsFromObjectMetadataItemFamilySelector } from '@/views/states/selectors/viewsFromObjectMetadataItemFamilySelector';

const StyledPickerContainer = styled.div`
  margin: ${themeCssVariables.spacing[2]} 0;
`;

export type RecordViewEmbedSelection = {
  viewId: string;
  viewName: string;
  objectMetadataId: string;
};

type RecordViewEmbedViewPickerProps = {
  blockId: string;
  onSelectView: (selection: RecordViewEmbedSelection) => void;
};

// Two-step picker (object, then its views) for an unconfigured embed. Uses the
// shared metadata + dropdown primitives; it never touches the page's own
// context-store view so the host document's view stays untouched.
export const RecordViewEmbedViewPicker = ({
  blockId,
  onSelectView,
}: RecordViewEmbedViewPickerProps) => {
  const { t } = useLingui();
  const { closeDropdown } = useCloseDropdown();
  const dropdownId = `${RECORD_VIEW_EMBED_PICKER_DROPDOWN_ID}-${blockId}`;

  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();

  const pickableObjectMetadataItems = readableObjectMetadataItems.filter(
    (objectMetadataItem) => !objectMetadataItem.isSystem,
  );

  const [selectedObjectMetadataId, setSelectedObjectMetadataId] = useState('');

  const selectedObjectMetadataItem = pickableObjectMetadataItems.find(
    (objectMetadataItem) => objectMetadataItem.id === selectedObjectMetadataId,
  );

  const views = useAtomFamilySelectorValue(
    viewsFromObjectMetadataItemFamilySelector,
    { objectMetadataItemId: selectedObjectMetadataId },
  );

  const handleSelectView = (viewId: string, viewName: string) => {
    if (selectedObjectMetadataId.length === 0) {
      return;
    }

    onSelectView({
      viewId,
      viewName,
      objectMetadataId: selectedObjectMetadataId,
    });

    setSelectedObjectMetadataId('');
    closeDropdown(dropdownId);
  };

  return (
    <StyledPickerContainer contentEditable={false}>
      <Dropdown
        dropdownId={dropdownId}
        dropdownPlacement="bottom-start"
        clickableComponent={
          <Button
            title={t`Embed a view`}
            size="small"
            Icon={IconDatabase}
            variant="secondary"
          />
        }
        dropdownComponents={
          <DropdownContent>
            {selectedObjectMetadataItem === undefined ? (
              <DropdownMenuItemsContainer hasMaxHeight>
                {pickableObjectMetadataItems.map((objectMetadataItem) => (
                  <MenuItem
                    key={objectMetadataItem.id}
                    text={objectMetadataItem.labelSingular}
                    onClick={() =>
                      setSelectedObjectMetadataId(objectMetadataItem.id)
                    }
                  />
                ))}
              </DropdownMenuItemsContainer>
            ) : (
              <>
                <DropdownMenuSectionLabel
                  label={selectedObjectMetadataItem.labelSingular}
                />
                <DropdownMenuItemsContainer hasMaxHeight>
                  <MenuItem
                    LeftIcon={IconChevronLeft}
                    text={t`Back`}
                    onClick={() => setSelectedObjectMetadataId('')}
                  />
                  {views.map((view) => (
                    <MenuItem
                      key={view.id}
                      text={view.name}
                      onClick={() => handleSelectView(view.id, view.name)}
                    />
                  ))}
                </DropdownMenuItemsContainer>
              </>
            )}
          </DropdownContent>
        }
      />
    </StyledPickerContainer>
  );
};
