export type ObjectMetadataNameHolder = {
  nameSingular: string;
};

// Apps install as a unit, so one object metadata item is the install signal a
// widget gates on: calling `useFindManyRecords` for an absent app object throws
// ObjectMetadataItemNotFoundError before its `skip` flag is ever read.
export const hasObjectMetadataItem = (
  objectMetadataItems: ObjectMetadataNameHolder[],
  nameSingular: string,
): boolean =>
  objectMetadataItems.some(
    (objectMetadataItem) => objectMetadataItem.nameSingular === nameSingular,
  );
