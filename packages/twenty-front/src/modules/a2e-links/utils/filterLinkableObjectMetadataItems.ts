import { isLinkableObjectNameSingular } from '@/a2e-links/utils/buildA2eLinkRecordInput';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { filterReadableActiveObjectMetadataItems } from '@/object-metadata/utils/filterReadableActiveObjectMetadataItems';
import { type ObjectPermissions } from 'twenty-shared/types';

// The picker's searchable set: objects that are readable (permission), active,
// non-system, searchable, AND have a declared a2eLink morph leg. Reusing
// filterReadableActiveObjectMetadataItems keeps the permission rule identical
// to the rest of the picker stack — a role that cannot read an object never
// sees it here.
export const filterLinkableObjectMetadataItems = (
  objectMetadataItems: EnrichedObjectMetadataItem[],
  objectPermissionsByObjectMetadataId: Record<
    string,
    ObjectPermissions & { objectMetadataId: string }
  >,
): EnrichedObjectMetadataItem[] =>
  filterReadableActiveObjectMetadataItems(
    objectMetadataItems,
    objectPermissionsByObjectMetadataId,
  ).filter(
    (objectMetadataItem) =>
      !objectMetadataItem.isSystem &&
      objectMetadataItem.isSearchable &&
      isLinkableObjectNameSingular(objectMetadataItem.nameSingular),
  );
