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
