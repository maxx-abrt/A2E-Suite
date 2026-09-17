import {
  generateFractionalIndexBetween,
  type FractionalIndexBounds,
} from './fractional-position.ts';

// Tree mutations are payload construction only: the browser owns persistence,
// so reparent/reorder/restore stay pure and unit-testable.

export type TreeDocument = {
  id: string;
  parentDocumentId?: string | null;
  position?: string | null;
};

export type MoveDocumentPayload = {
  parentDocumentId?: string | null;
  position: string;
};

const positionBoundsAt = (
  siblings: TreeDocument[],
  insertIndex: number,
): FractionalIndexBounds => {
  const previous = siblings[insertIndex - 1]?.position ?? undefined;
  const next = siblings[insertIndex]?.position ?? undefined;

  return {
    previous: previous ?? undefined,
    next: next ?? undefined,
  };
};

// A document can never become a descendant of itself: the cycle would hide
// the subtree from every listing (no root, no trash path).
export const isDescendantOf = (
  candidateId: string,
  ancestorId: string,
  documentsById: Map<string, TreeDocument>,
): boolean => {
  let cursorId: string | null | undefined = candidateId;

  while (isDefinedCursor(cursorId)) {
    if (cursorId === ancestorId) {
      return true;
    }

    cursorId = documentsById.get(cursorId)?.parentDocumentId ?? null;
  }

  return false;
};

const isDefinedCursor = (value: string | null | undefined): value is string =>
  value != null && value !== '';

export const buildMoveDocumentPayload = (options: {
  documentId: string;
  targetParentId: string | null;
  targetSiblings: TreeDocument[];
  insertIndex: number;
  documentsById: Map<string, TreeDocument>;
}): MoveDocumentPayload => {
  if (
    options.targetParentId !== null &&
    (options.documentId === options.targetParentId ||
      isDescendantOf(
        options.targetParentId,
        options.documentId,
        options.documentsById,
      ))
  ) {
    throw new Error('cannot move a document under itself or its descendants');
  }

  const siblingsWithoutSelf = options.targetSiblings.filter(
    (sibling) => sibling.id !== options.documentId,
  );
  const insertIndex = Math.min(
    Math.max(options.insertIndex, 0),
    siblingsWithoutSelf.length,
  );

  return {
    parentDocumentId: options.targetParentId,
    position: generateFractionalIndexBetween(
      positionBoundsAt(siblingsWithoutSelf, insertIndex),
    ),
  };
};

export const buildRestoreDocumentPayload = (options: {
  targetParentId: string | null;
  targetSiblings: TreeDocument[];
}): MoveDocumentPayload => ({
  parentDocumentId: options.targetParentId,
  position: generateFractionalIndexBetween(
    positionBoundsAt(options.targetSiblings, options.targetSiblings.length),
  ),
});

// The parent link comes from the sibling map key, not the row: a lazily
// loaded page knows the parent it was fetched for even when the query does
// not select the join column.
export const collectDocumentsByIdFromSiblings = (
  siblingsByParentId: Map<string | null, TreeDocument[]>,
): Map<string, TreeDocument> => {
  const documentsById = new Map<string, TreeDocument>();

  for (const [parentId, siblings] of siblingsByParentId) {
    for (const sibling of siblings) {
      documentsById.set(sibling.id, {
        id: sibling.id,
        parentDocumentId: parentId,
        position: sibling.position ?? null,
      });
    }
  }

  return documentsById;
};

export type TreeDocumentNode = TreeDocument & {
  children?: { edges: { node: TreeDocumentNode }[] };
};

const toTreeDocument = (node: TreeDocumentNode): TreeDocument => ({
  id: node.id,
  parentDocumentId: node.parentDocumentId ?? null,
  position: node.position ?? null,
});

// Sibling lists are read from the nested edges, not from the parentDocumentId
// column: the browser query selects roots with a single child level and does
// not select child.parentDocumentId, so the nesting is the only reliable
// parent link at this depth.
export const collectSiblingsByParentId = (
  roots: TreeDocumentNode[],
): Map<string | null, TreeDocument[]> => {
  const siblingsByParentId = new Map<string | null, TreeDocument[]>();

  const visit = (parentId: string | null, nodes: TreeDocumentNode[]): void => {
    siblingsByParentId.set(parentId, nodes.map(toTreeDocument));

    for (const node of nodes) {
      visit(node.id, node.children?.edges.map((edge) => edge.node) ?? []);
    }
  };

  visit(null, roots);

  return siblingsByParentId;
};
