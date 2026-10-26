import { BILAN_METADATA_UNIVERSAL_IDENTIFIERS } from '@/bilan/constants/BilanMetadata';
import { frontComponentsSelector } from '@/front-components/states/frontComponentsSelector';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { canCreateRecordsForObjectMetadataItem } from '@/object-record/utils/canCreateRecordsForObjectMetadataItem';
import { useOpenFrontComponentInSidePanel } from '@/side-panel/hooks/useOpenFrontComponentInSidePanel';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

export const BilanQuickEntryAction = ({
  objectMetadataItem,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
}) => {
  const { t } = useLingui();
  const frontComponents = useAtomStateValue(frontComponentsSelector);
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );
  const { openFrontComponentInSidePanel } = useOpenFrontComponentInSidePanel();
  const frontComponent = frontComponents.find(
    (candidate) =>
      candidate.universalIdentifier ===
      BILAN_METADATA_UNIVERSAL_IDENTIFIERS.quickEntry,
  );
  const canFillEntry = ['label', 'amount', 'entryDate', 'entryType'].every(
    (name) =>
      objectMetadataItem.updatableFields.some((field) => field.name === name),
  );
  if (
    !frontComponent ||
    !canFillEntry ||
    !canCreateRecordsForObjectMetadataItem({
      objectMetadataItem,
      objectPermissions,
    })
  )
    return null;
  return (
    <Button
      title={t`Add transaction`}
      ariaLabel={t`Add transaction`}
      Icon={IconPlus}
      onClick={() =>
        openFrontComponentInSidePanel({
          frontComponentId: frontComponent.id,
          pageTitle: t`Add transaction`,
          pageIcon: IconPlus,
        })
      }
    />
  );
};
