import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type BureauTree } from '@/bureau/types/BureauTree';
import { isDefined } from 'twenty-shared/utils';

// Ancestors of a page, ordered from the root down to its direct parent.
export const getBureauAncestors = (
  documentId: string,
  tree: BureauTree,
): BureauDocument[] => {
  const ancestors: BureauDocument[] = [];
  const visitedIds = new Set<string>([documentId]);
  let parentId = tree.parentIdById.get(documentId) ?? null;

  while (isDefined(parentId) && !visitedIds.has(parentId)) {
    const parent = tree.documentsById.get(parentId);

    if (!isDefined(parent)) {
      break;
    }

    visitedIds.add(parentId);
    ancestors.unshift(parent);
    parentId = tree.parentIdById.get(parentId) ?? null;
  }

  return ancestors;
};
