// Server-side cycle guard. The browser already refuses a cyclic move in
// `buildMoveDocumentPayload`, but the tree is writable by any API client, so a
// committed move must still be re-checked where it lands. A database event
// fires after the write: it cannot reject the row it already stored, so it
// restores the previous parent (or detaches to the root) instead — the tree is
// guaranteed acyclic after the event settles.
//
// The walk takes an injected loader so the decision stays pure and unit-tested
// without a running server.

export type DocumentParentRecord = {
  parent?: { id?: string | null } | null;
  parentDocumentId?: string | null;
  parentId?: string | null;
};

export type DocumentParentLoader = (
  documentId: string,
) => Promise<string | null>;

export type DocumentParentWriter = (options: {
  documentId: string;
  parentDocumentId: string | null;
}) => Promise<void>;

export type DocumentParentCycleOutcome =
  | { action: 'none' }
  | { action: 'repaired'; parentDocumentId: string | null };

// The event carries the raw join column, but a query result carries the
// relation object — read whichever shape the caller has.
export const readDocumentParentId = (
  record: DocumentParentRecord | null | undefined,
): string | null => {
  if (record == null) {
    return null;
  }

  const parentId =
    record.parent?.id ?? record.parentDocumentId ?? record.parentId ?? null;

  return parentId === '' ? null : parentId;
};

export type DocumentParentRelationDiff = {
  parent?: {
    before?: { id?: string | null } | null;
    after?: { id?: string | null } | null;
  } | null;
};

export type DocumentParentEventProperties = {
  before?: DocumentParentRecord | null;
  after?: DocumentParentRecord | null;
  diff?: DocumentParentRelationDiff | null;
};

// The raw event record may omit the join column while the relation diff always
// carries the changed ids, so prefer the record and fall back to the diff.
export const readDocumentParentChange = (
  properties: DocumentParentEventProperties | null | undefined,
): {
  parentDocumentId: string | null;
  previousParentDocumentId: string | null;
} => {
  const parentDiff = properties?.diff?.parent;

  return {
    parentDocumentId:
      readDocumentParentId(properties?.after) ?? parentDiff?.after?.id ?? null,
    previousParentDocumentId:
      readDocumentParentId(properties?.before) ??
      parentDiff?.before?.id ??
      null,
  };
};

export const isDocumentParentCycle = async (options: {
  documentId: string;
  parentDocumentId: string | null | undefined;
  loadParentDocumentId: DocumentParentLoader;
}): Promise<boolean> => {
  const { documentId, parentDocumentId, loadParentDocumentId } = options;

  if (parentDocumentId == null || parentDocumentId === '') {
    return false;
  }

  // The visited set is the complete cycle detector: a cycle must revisit a
  // node, and a finite table cannot yield an endless non-repeating chain.
  const visited = new Set<string>([documentId]);
  let cursor: string | null = parentDocumentId;

  while (cursor != null && cursor !== '') {
    if (visited.has(cursor)) {
      return true;
    }

    visited.add(cursor);
    cursor = await loadParentDocumentId(cursor);
  }

  return false;
};

// Reverting is only safe when the previous parent is itself acyclic: an
// already-corrupt ancestry must fall back to the root, the one parent every
// document can take without a cycle.
export const resolveDocumentCycleRepairParentId = async (options: {
  documentId: string;
  previousParentDocumentId: string | null | undefined;
  loadParentDocumentId: DocumentParentLoader;
}): Promise<string | null> => {
  const { documentId, previousParentDocumentId, loadParentDocumentId } =
    options;

  if (
    previousParentDocumentId == null ||
    previousParentDocumentId === '' ||
    previousParentDocumentId === documentId
  ) {
    return null;
  }

  const previousIsCyclic = await isDocumentParentCycle({
    documentId,
    parentDocumentId: previousParentDocumentId,
    loadParentDocumentId,
  });

  return previousIsCyclic ? null : previousParentDocumentId;
};

export const repairDocumentParentCycle = async (options: {
  documentId: string;
  parentDocumentId: string | null | undefined;
  previousParentDocumentId: string | null | undefined;
  loadParentDocumentId: DocumentParentLoader;
  updateParentDocumentId: DocumentParentWriter;
}): Promise<DocumentParentCycleOutcome> => {
  const {
    documentId,
    parentDocumentId,
    previousParentDocumentId,
    loadParentDocumentId,
    updateParentDocumentId,
  } = options;

  const createsCycle = await isDocumentParentCycle({
    documentId,
    parentDocumentId,
    loadParentDocumentId,
  });

  if (!createsCycle) {
    return { action: 'none' };
  }

  const repairedParentDocumentId = await resolveDocumentCycleRepairParentId({
    documentId,
    previousParentDocumentId,
    loadParentDocumentId,
  });

  await updateParentDocumentId({
    documentId,
    parentDocumentId: repairedParentDocumentId,
  });

  return { action: 'repaired', parentDocumentId: repairedParentDocumentId };
};
