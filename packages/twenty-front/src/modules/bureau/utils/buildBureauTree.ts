import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type BureauTree } from '@/bureau/types/BureauTree';
import { compareBureauDocuments } from '@/bureau/utils/compareBureauDocuments';
import { isDefined } from 'twenty-shared/utils';

export const buildBureauTree = (documents: BureauDocument[]): BureauTree => {
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const parentIdById = new Map<string, string | null>();
  const childrenByParentId = new Map<string | null, BureauDocument[]>();

  for (const document of documents) {
    const parentId =
      isDefined(document.parentId) &&
      document.parentId !== document.id &&
      documentsById.has(document.parentId)
        ? document.parentId
        : null;

    parentIdById.set(document.id, parentId);
  }

  // A parent cycle (A -> B -> A) would hide both pages from the root walk:
  // walk from the root and re-attach anything unreachable to the root.
  const childIdsByParentId = new Map<string | null, string[]>();

  for (const [documentId, parentId] of parentIdById) {
    const childIds = childIdsByParentId.get(parentId) ?? [];
    childIds.push(documentId);
    childIdsByParentId.set(parentId, childIds);
  }

  const reachableIds = new Set<string>();
  const pendingIds = [...(childIdsByParentId.get(null) ?? [])];

  while (pendingIds.length > 0) {
    const documentId = pendingIds.pop() as string;

    if (reachableIds.has(documentId)) {
      continue;
    }

    reachableIds.add(documentId);
    pendingIds.push(...(childIdsByParentId.get(documentId) ?? []));
  }

  for (const documentId of parentIdById.keys()) {
    if (!reachableIds.has(documentId)) {
      parentIdById.set(documentId, null);
    }
  }

  for (const document of documents) {
    const parentId = parentIdById.get(document.id) ?? null;
    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(document);
    childrenByParentId.set(parentId, siblings);
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort(compareBureauDocuments);
  }

  return { documentsById, childrenByParentId, parentIdById };
};
