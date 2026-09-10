// Optimistic merge guardrail for document saves (v1, no OT): a save is
// accepted when the version the edits were based on is still the latest; a
// concurrent save is tolerated only if it touched a DISJOINT set of blocks
// (block-level merge); any block-level overlap is a conflict the user must
// resolve (reload + reapply), because without OT there is no safe way to
// interleave two writes to the same block.

export type OptimisticDocumentUpdateInput = {
  // Version the local edits were made against.
  baseVersion: number;
  // Version currently persisted server-side.
  latestVersion: number;
  localChangedBlockIds: string[];
  remoteChangedBlockIds: string[];
};

export type OptimisticDocumentUpdateResult =
  | { outcome: 'clean'; conflictingBlockIds: [] }
  | { outcome: 'merged'; conflictingBlockIds: [] }
  | { outcome: 'conflict'; conflictingBlockIds: string[] };

const toBlockIdSet = (blockIds: string[]): Set<string> => new Set(blockIds);

export const resolveOptimisticDocumentUpdate = ({
  baseVersion,
  latestVersion,
  localChangedBlockIds,
  remoteChangedBlockIds,
}: OptimisticDocumentUpdateInput): OptimisticDocumentUpdateResult => {
  if (baseVersion === latestVersion) {
    return { outcome: 'clean', conflictingBlockIds: [] };
  }

  const remoteChangedBlockIdSet = toBlockIdSet(remoteChangedBlockIds);
  const conflictingBlockIds = localChangedBlockIds.filter((localBlockId) =>
    remoteChangedBlockIdSet.has(localBlockId),
  );

  if (conflictingBlockIds.length > 0) {
    return { outcome: 'conflict', conflictingBlockIds };
  }

  return { outcome: 'merged', conflictingBlockIds: [] };
};
