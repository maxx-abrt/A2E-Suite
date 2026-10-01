export type A2eLinkEndpoints = {
  sourceObjectNameSingular: string;
  sourceRecordId: string;
  targetObjectNameSingular: string;
  targetRecordId: string;
};

// Stable `${sourceObject}:${sourceId}:${targetObject}:${targetId}` dedup key,
// exactly the value a2e-links documents for its unique `linkKey`. A repeated
// pair yields the same key, so the server's unique index rejects it.
export const buildA2eLinkKey = ({
  sourceObjectNameSingular,
  sourceRecordId,
  targetObjectNameSingular,
  targetRecordId,
}: A2eLinkEndpoints): string =>
  `${sourceObjectNameSingular}:${sourceRecordId}:${targetObjectNameSingular}:${targetRecordId}`;
