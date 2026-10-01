import { t } from '@lingui/core/macro';
import { useCallback, useMemo } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconLink } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

import { useCreateA2eLink } from '@/a2e-links/hooks/useCreateA2eLink';
import { useIsA2eLinksApplicationInstalled } from '@/a2e-links/hooks/useIsA2eLinksApplicationInstalled';
import { filterLinkableObjectMetadataItems } from '@/a2e-links/utils/filterLinkableObjectMetadataItems';
import { shouldShowA2eLinkAction } from '@/a2e-links/utils/shouldShowA2eLinkAction';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { SingleRecordPicker } from '@/object-record/record-picker/single-record-picker/components/SingleRecordPicker';
import { type RecordPickerPickableMorphItem } from '@/object-record/record-picker/types/RecordPickerPickableMorphItem';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useCloseDropdown } from '@/ui/layout/dropdown/hooks/useCloseDropdown';

const LINK_TO_RECORD_DROPDOWN_ID = 'link-to-record-dropdown';

type LinkToRecordButtonProps = {
  sourceObjectNameSingular: string;
  sourceRecordId: string;
};

type LinkToRecordButtonContentProps = LinkToRecordButtonProps;

// The install/leg gate lives in the outer component so the inner one is never
// rendered (and `useCreateOneRecord` is never called) while a2e-links is absent
// or the current object has no morph leg.
export const LinkToRecordButton = ({
  sourceObjectNameSingular,
  sourceRecordId,
}: LinkToRecordButtonProps) => {
  const isA2eLinksApplicationInstalled = useIsA2eLinksApplicationInstalled();

  const shouldShow = shouldShowA2eLinkAction({
    isA2eLinksApplicationInstalled,
    sourceObjectNameSingular,
  });

  if (!shouldShow) {
    return null;
  }

  return (
    <LinkToRecordButtonContent
      sourceObjectNameSingular={sourceObjectNameSingular}
      sourceRecordId={sourceRecordId}
    />
  );
};

const LinkToRecordButtonContent = ({
  sourceObjectNameSingular,
  sourceRecordId,
}: LinkToRecordButtonContentProps) => {
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { createA2eLink } = useCreateA2eLink();
  const { closeDropdown } = useCloseDropdown();

  const linkableObjectMetadataItems = useMemo(
    () =>
      filterLinkableObjectMetadataItems(
        objectMetadataItems,
        objectPermissionsByObjectMetadataId,
      ),
    [objectMetadataItems, objectPermissionsByObjectMetadataId],
  );

  const objectNameSingulars = useMemo(
    () =>
      linkableObjectMetadataItems.map(
        (objectMetadataItem) => objectMetadataItem.nameSingular,
      ),
    [linkableObjectMetadataItems],
  );

  const handleClose = useCallback(() => {
    closeDropdown(LINK_TO_RECORD_DROPDOWN_ID);
  }, [closeDropdown]);

  const handleMorphItemSelected = useCallback(
    (selectedMorphItem?: RecordPickerPickableMorphItem) => {
      handleClose();

      if (!isDefined(selectedMorphItem)) {
        return;
      }

      const targetObjectMetadataItem = linkableObjectMetadataItems.find(
        (objectMetadataItem) =>
          objectMetadataItem.id === selectedMorphItem.objectMetadataId,
      );

      if (!isDefined(targetObjectMetadataItem)) {
        return;
      }

      void createA2eLink({
        sourceObjectNameSingular,
        sourceRecordId,
        targetObjectNameSingular: targetObjectMetadataItem.nameSingular,
        targetRecordId: selectedMorphItem.recordId,
      });
    },
    [
      createA2eLink,
      handleClose,
      linkableObjectMetadataItems,
      sourceObjectNameSingular,
      sourceRecordId,
    ],
  );

  if (objectNameSingulars.length === 0) {
    return null;
  }

  return (
    <Dropdown
      dropdownId={LINK_TO_RECORD_DROPDOWN_ID}
      dropdownPlacement="bottom-end"
      clickableComponent={
        <Button
          Icon={IconLink}
          title={t`Link…`}
          variant="secondary"
          size="small"
        />
      }
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
  );
};
