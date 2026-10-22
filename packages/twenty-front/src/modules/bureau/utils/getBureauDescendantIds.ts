import { type BureauDocument } from '@/bureau/types/BureauDocument';

// Every page nested (at any depth) under `documentId`, excluding itself.
export const getBureauDescendantIds = (
  documentId: string,
  childrenByParentId: Map<string | null, Pick<BureauDocument, 'id'>[]>,
): string[] => {
  const descendantIds: string[] = [];
  const visitedIds = new Set<string>([documentId]);
  const pendingIds = [documentId];

  while (pendingIds.length > 0) {
    const currentId = pendingIds.pop() as string;

    for (const child of childrenByParentId.get(currentId) ?? []) {
      if (visitedIds.has(child.id)) {
        continue;
      }

      visitedIds.add(child.id);
      descendantIds.push(child.id);
      pendingIds.push(child.id);
    }
  }

  return descendantIds;
};
