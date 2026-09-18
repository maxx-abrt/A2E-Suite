// Folder-tree cycle guard, mirroring the P3.3 document pattern. The folder
// tree is writable by any API client, so a committed move must be re-checked
// where it lands. A database event fires after the write: it cannot reject the
// row it already stored, so it restores the previous parent (or detaches to
// the root) instead — the tree is guaranteed acyclic after the event settles.
//
// The walk takes an injected loader so the decision stays pure and unit-tested
// without a running server.

export type FolderParentRecord = {
  parent?: { id?: string | null } | null;
  parentFolderId?: string | null;
  parentId?: string | null;
};

export type FolderParentLoader = (
  folderId: string,
) => Promise<string | null>;

export type FolderParentWriter = (options: {
  folderId: string;
  parentFolderId: string | null;
}) => Promise<void>;

export type FolderParentCycleOutcome =
  | { action: 'none' }
  | { action: 'repaired'; parentFolderId: string | null };

// The event carries the raw join column, but a query result carries the
// relation object — read whichever shape the caller has.
export const readFolderParentId = (
  record: FolderParentRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  const parentId =
    record.parent?.id ?? record.parentFolderId ?? record.parentId ?? null;

  return parentId === '' ? null : parentId;
};

export type FolderParentRelationDiff = {
  parent?: {
    before?: { id?: string | null } | null;
    after?: { id?: string | null } | null;
  } | null;
};

export type FolderParentEventProperties = {
  before?: FolderParentRecord | null;
  after?: FolderParentRecord | null;
  diff?: FolderParentRelationDiff | null;
};

// The raw event record may omit the join column while the relation diff always
// carries the changed ids, so prefer the record and fall back to the diff.
export const readFolderParentChange = (
  properties: FolderParentEventProperties | null | undefined,
): {
  parentFolderId: string | null;
  previousParentFolderId: string | null;
} => {
  const parentDiff = properties?.diff?.parent;

  return {
    parentFolderId:
      readFolderParentId(properties?.after) ?? parentDiff?.after?.id ?? null,
    previousParentFolderId:
      readFolderParentId(properties?.before) ??
      parentDiff?.before?.id ??
      null,
  };
};

export const isFolderParentCycle = async (options: {
  folderId: string;
  parentFolderId: string | null | undefined;
  loadParentFolderId: FolderParentLoader;
}): Promise<boolean> => {
  const { folderId, parentFolderId, loadParentFolderId } = options;

  if (parentFolderId == null || parentFolderId === '') {
    return false;
  }

  // The visited set is the complete cycle detector: a cycle must revisit a
  // node, and a finite table cannot yield an endless non-repeating chain.
  const visited = new Set<string>([folderId]);
  let cursor: string | null = parentFolderId;

  while (cursor != null && cursor !== '') {
    if (visited.has(cursor)) {
      return true;
    }

    visited.add(cursor);
    cursor = await loadParentFolderId(cursor);
  }

  return false;
};

// Reverting is only safe when the previous parent is itself acyclic: an
// already-corrupt ancestry must fall back to the root, the one parent every
// folder can take without a cycle.
export const resolveFolderCycleRepairParentId = async (options: {
  folderId: string;
  previousParentFolderId: string | null | undefined;
  loadParentFolderId: FolderParentLoader;
}): Promise<string | null> => {
  const { folderId, previousParentFolderId, loadParentFolderId } = options;

  if (
    previousParentFolderId == null ||
    previousParentFolderId === '' ||
    previousParentFolderId === folderId
  ) {
    return null;
  }

  const previousIsCyclic = await isFolderParentCycle({
    folderId,
    parentFolderId: previousParentFolderId,
    loadParentFolderId,
  });

  return previousIsCyclic ? null : previousParentFolderId;
};

export const repairFolderParentCycle = async (options: {
  folderId: string;
  parentFolderId: string | null | undefined;
  previousParentFolderId: string | null | undefined;
  loadParentFolderId: FolderParentLoader;
  updateParentFolderId: FolderParentWriter;
}): Promise<FolderParentCycleOutcome> => {
  const {
    folderId,
    parentFolderId,
    previousParentFolderId,
    loadParentFolderId,
    updateParentFolderId,
  } = options;

  const createsCycle = await isFolderParentCycle({
    folderId,
    parentFolderId,
    loadParentFolderId,
  });

  if (!createsCycle) {
    return { action: 'none' };
  }

  const repairedParentFolderId = await resolveFolderCycleRepairParentId({
    folderId,
    previousParentFolderId,
    loadParentFolderId,
  });

  await updateParentFolderId({
    folderId,
    parentFolderId: repairedParentFolderId,
  });

  return { action: 'repaired', parentFolderId: repairedParentFolderId };
};
