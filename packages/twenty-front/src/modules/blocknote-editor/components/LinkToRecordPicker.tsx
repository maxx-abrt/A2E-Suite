import { useBlockNoteEditor } from '@blocknote/react';
import { styled } from '@linaria/react';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { isDefined } from 'twenty-shared/utils';

import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { filterReadableActiveObjectMetadataItems } from '@/object-metadata/utils/filterReadableActiveObjectMetadataItems';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { SingleRecordPicker } from '@/object-record/record-picker/single-record-picker/components/SingleRecordPicker';
import { type RecordPickerPickableMorphItem } from '@/object-record/record-picker/types/RecordPickerPickableMorphItem';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';

const LINK_TO_RECORD_DROPDOWN_ID = 'link-to-record-slash-dropdown';

const StyledAnchor = styled.span`
  height: 0;
  width: 0;
`;

type LinkToRecordPickerProps = {
  isDropdownOpen: boolean;
};

// Renders the SingleRecordPicker for the /link-to-record slash item. The
// Dropdown's own open state is driven by isDropdownOpenComponentState via
// useOpenDropdown from the slash-menu item click — no new picker framework.
export const LinkToRecordPicker = ({
  isDropdownOpen,
}: LinkToRecordPickerProps) => {
  const editor: typeof BLOCK_SCHEMA.BlockNoteEditor = useBlockNoteEditor();
  const { closeDropdown } = useCloseDropdown();

  const { activeObjectMetadataItems } = useFilteredObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  const searchableObjectMetadataItems = filterReadableActiveObjectMetadataItems(
    activeObjectMetadataItems,
    objectPermissionsByObjectMetadataId,
  ).filter((item) => !item.isSystem && item.isSearchable);

  const objectNameSingulars = searchableObjectMetadataItems.map(
    (objectMetadataItem) => objectMetadataItem.nameSingular,
  );

  const handleClose = () => {
    closeDropdown(LINK_TO_RECORD_DROPDOWN_ID);
  };

  const handleMorphItemSelected = (
    selectedMorphItem?: RecordPickerPickableMorphItem,
  ) => {
    handleClose();

    if (
      !isDefined(selectedMorphItem) ||
      !isDefined(selectedMorphItem.recordId) ||
      !isDefined(selectedMorphItem.objectMetadataId)
    ) {
      return;
    }

    const objectMetadataItem = searchableObjectMetadataItems.find(
      (item) => item.id === selectedMorphItem.objectMetadataId,
    );

    if (!isDefined(objectMetadataItem)) {
      return;
    }

    editor.insertInlineContent([
      {
        type: 'mention',
        props: {
          recordId: selectedMorphItem.recordId,
          objectMetadataId: selectedMorphItem.objectMetadataId,
          objectNameSingular: objectMetadataItem.nameSingular,
          label: objectMetadataItem.labelSingular,
          imageUrl: '',
        },
      },
      ' ',
    ]);
  };

  return (
    <>
      <StyledAnchor />
      {isDropdownOpen && (
        <Dropdown
          dropdownId={LINK_TO_RECORD_DROPDOWN_ID}
          dropdownPlacement="bottom-start"
          clickableComponent={<StyledAnchor />}
          dropdownComponents={
            <SingleRecordPicker
              focusId={LINK_TO_RECORD_DROPDOWN_ID}
              componentInstanceId={LINK_TO_RECORD_DROPDOWN_ID}
              onCancel={handleClose}
              onMorphItemSelected={handleMorphItemSelected}
              objectNameSingulars={objectNameSingulars}
            />
          }
        />
      )}
    </>
  );
};
