import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { isNonEmptyString } from '@sniptt/guards';
import { type ObjectPermissions } from 'twenty-shared/types';

// Minimal object-metadata shape the resolver needs; keeps this pure util
// testable without dragging the enriched metadata type into a unit test.
export type RecordViewEmbedObjectMetadata = {
  id: string;
  labelSingular: string;
};

export type RecordViewEmbedState =
  | { status: 'unconfigured' }
  | { status: 'unavailable' }
  | { status: 'denied'; objectLabel: string }
  | { status: 'ready'; objectMetadataId: string };

type ResolveRecordViewEmbedStateInput = {
  viewId: string;
  objectMetadataId: string;
  objectMetadataItems: RecordViewEmbedObjectMetadata[];
  objectPermissionsByObjectMetadataId: Record<
    string,
    ObjectPermissions & { objectMetadataId: string }
  >;
};

// Decides what an embedded view block may render. A missing view or object is
// "unavailable" (safe stub), never a raw error; a present object the user
// cannot read is "denied". `getObjectPermissionsForObject` defaults to allowed
// for unknown ids, so the object-existence check must run first.
export const resolveRecordViewEmbedState = ({
  viewId,
  objectMetadataId,
  objectMetadataItems,
  objectPermissionsByObjectMetadataId,
}: ResolveRecordViewEmbedStateInput): RecordViewEmbedState => {
  if (!isNonEmptyString(viewId) || !isNonEmptyString(objectMetadataId)) {
    return { status: 'unconfigured' };
  }

  const objectMetadataItem = objectMetadataItems.find(
    (item) => item.id === objectMetadataId,
  );

  if (objectMetadataItem === undefined) {
    return { status: 'unavailable' };
  }

  const objectPermissions = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataId,
  );

  if (!objectPermissions.canReadObjectRecords) {
    return { status: 'denied', objectLabel: objectMetadataItem.labelSingular };
  }

  return { status: 'ready', objectMetadataId };
};
