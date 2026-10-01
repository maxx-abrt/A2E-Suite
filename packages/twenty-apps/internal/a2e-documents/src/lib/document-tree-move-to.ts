import {
  buildMoveDocumentPayload,
  isDescendantOf,
  type MoveDocumentPayload,
  type TreeDocument,
} from './document-tree.ts';

// Move-to request building only: the dialog renders a flat, searchable view of
// the loaded tree, then delegates to the same payload builder the drag/drop and
// keyboard paths use — the browser owns persistence, so no second mutation
// shape (and no second tree state) exists.

export type MoveToCandidateNode = {
  id: string;
  title: string;
  children?: { edges: { node: MoveToCandidateNode }[] };
};

export type MoveToCandidate = {
  id: string;
  title: string;
  depth: number;
};

// Depth-first flatten that carries the nesting depth so the dialog can indent
// children under their parent. A visited set breaks a corrupted cycle.
export const collectMoveToCandidates = <TNode extends MoveToCandidateNode>(
  roots: TNode[],
): MoveToCandidate[] => {
  const candidates: MoveToCandidate[] = [];
  const visitedIds = new Set<string>();

  const visit = (nodes: MoveToCandidateNode[], depth: number): void => {
    for (const node of nodes) {
      if (visitedIds.has(node.id)) {
        continue;
      }

      visitedIds.add(node.id);
      candidates.push({ id: node.id, title: node.title, depth });
      visit(node.children?.edges.map((edge) => edge.node) ?? [], depth + 1);
    }
  };

  visit(roots, 0);

  return candidates;
};

// The moved document and its whole subtree are not valid destinations: choosing
// one would hide the subtree behind its own descendant.
export const collectMoveToExcludedIds = (options: {
  documentId: string;
  documentsById: Map<string, TreeDocument>;
}): Set<string> => {
  const excludedIds = new Set<string>([options.documentId]);

  for (const candidateId of options.documentsById.keys()) {
    if (isDescendantOf(candidateId, options.documentId, options.documentsById)) {
      excludedIds.add(candidateId);
    }
  }

  return excludedIds;
};

export const filterMoveToCandidates = (
  candidates: MoveToCandidate[],
  options: { query: string; excludedIds: ReadonlySet<string> },
): MoveToCandidate[] => {
  const normalizedQuery = options.query.trim().toLowerCase();

  return candidates.filter((candidate) => {
    if (options.excludedIds.has(candidate.id)) {
      return false;
    }

    return (
      normalizedQuery === '' ||
      candidate.title.toLowerCase().includes(normalizedQuery)
    );
  });
};

// Appending under the chosen parent is what "move to" means; insertIndex at the
// end of the known sibling list reuses the exact drag payload builder.
export const buildMoveToDocumentPayload = (options: {
  documentId: string;
  targetParentId: string | null;
  targetSiblings: TreeDocument[];
  documentsById: Map<string, TreeDocument>;
}): MoveDocumentPayload | null => {
  try {
    return buildMoveDocumentPayload({
      documentId: options.documentId,
      targetParentId: options.targetParentId,
      targetSiblings: options.targetSiblings,
      insertIndex: options.targetSiblings.length,
      documentsById: options.documentsById,
    });
  } catch {
    return null;
  }
};
