import {
  buildMoveDocumentPayload,
  type MoveDocumentPayload,
  type TreeDocument,
} from './document-tree.ts';

// Keyboard move controls are the non-drag alternative C7 requires: every
// drag-reparent/reorder the browser offers must be reachable from a button.
// Pure request building only — the browser owns the mutation.

export type TreeMoveDirection = 'up' | 'down' | 'indent' | 'outdent';

type MoveTarget = {
  parentId: string | null;
  siblings: TreeDocument[];
  insertIndex: number;
};

const documentsByIdFromSiblings = (
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

const resolveMoveTarget = (
  options: {
    direction: TreeMoveDirection;
    parentId: string | null;
    siblingsByParentId: Map<string | null, TreeDocument[]>;
    documentsById: Map<string, TreeDocument>;
  },
  siblings: TreeDocument[],
  index: number,
): MoveTarget | null => {
  const previousSibling = siblings[index - 1];
  const nextSibling = siblings[index + 1];

  switch (options.direction) {
    case 'up':
      // The clamped payload builder already drops the moved row from the
      // bounds, so index - 1 is the desired slot in the filtered list.
      return index === 0
        ? null
        : { parentId: options.parentId, siblings, insertIndex: index - 1 };
    case 'down':
      return nextSibling === undefined
        ? null
        : { parentId: options.parentId, siblings, insertIndex: index + 1 };
    case 'indent': {
      if (previousSibling === undefined) {
        return null;
      }

      const children =
        options.siblingsByParentId.get(previousSibling.id) ?? [];

      return {
        parentId: previousSibling.id,
        siblings: children,
        insertIndex: children.length,
      };
    }
    case 'outdent': {
      if (options.parentId === null) {
        return null;
      }

      const parent = options.documentsById.get(options.parentId);

      if (parent === undefined) {
        return null;
      }

      const grandParentId = parent.parentDocumentId ?? null;
      const grandParentSiblings =
        options.siblingsByParentId.get(grandParentId) ?? [];
      const parentIndex = grandParentSiblings.findIndex(
        (sibling) => sibling.id === options.parentId,
      );

      return {
        parentId: grandParentId,
        siblings: grandParentSiblings,
        insertIndex:
          parentIndex === -1 ? grandParentSiblings.length : parentIndex + 1,
      };
    }
  }
};

export const buildKeyboardMovePayload = (options: {
  documentId: string;
  direction: TreeMoveDirection;
  parentId: string | null;
  siblingsByParentId: Map<string | null, TreeDocument[]>;
}): MoveDocumentPayload | null => {
  const siblings = options.siblingsByParentId.get(options.parentId) ?? [];
  const index = siblings.findIndex(
    (sibling) => sibling.id === options.documentId,
  );

  if (index === -1) {
    return null;
  }

  const documentsById = documentsByIdFromSiblings(options.siblingsByParentId);
  const target = resolveMoveTarget(
    {
      direction: options.direction,
      parentId: options.parentId,
      siblingsByParentId: options.siblingsByParentId,
      documentsById,
    },
    siblings,
    index,
  );

  if (target === null) {
    return null;
  }

  try {
    return buildMoveDocumentPayload({
      documentId: options.documentId,
      targetParentId: target.parentId,
      targetSiblings: target.siblings,
      insertIndex: target.insertIndex,
      documentsById,
    });
  } catch {
    return null;
  }
};
