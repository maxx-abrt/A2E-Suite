import { HOME_DOCUMENT_TEMPLATE_KIND } from '@/home-dashboard/utils/selectRecentPages';
import { type BureauTree } from '@/bureau/types/BureauTree';

export const getBureauSelectionRoots = (
  pageIds: string[],
  tree: BureauTree,
) => {
  const selectedIds = new Set(
    pageIds.filter((pageId) => tree.documentsById.has(pageId)),
  );
  return getBureauVisiblePageIds(tree, [...tree.documentsById.keys()]).filter(
    (pageId) => {
      if (!selectedIds.has(pageId)) return false;
      const visitedIds = new Set<string>([pageId]);
      let parentId = tree.parentIdById.get(pageId);
      while (parentId) {
        if (selectedIds.has(parentId) || visitedIds.has(parentId)) return false;
        visitedIds.add(parentId);
        parentId = tree.parentIdById.get(parentId);
      }
      return true;
    },
  );
};

export const getBureauVisiblePageIds = (
  tree: BureauTree,
  expandedPageIds: string[],
  includeTemplates = true,
) => {
  const visibleIds: string[] = [];
  const expandedIds = new Set(expandedPageIds);
  const pendingPages = (tree.childrenByParentId.get(null) ?? [])
    .filter(
      (page) => includeTemplates || page.kind !== HOME_DOCUMENT_TEMPLATE_KIND,
    )
    .toReversed();
  while (pendingPages.length > 0) {
    const page = pendingPages.pop();
    if (!page) continue;
    visibleIds.push(page.id);
    if (expandedIds.has(page.id)) {
      pendingPages.push(
        ...[...(tree.childrenByParentId.get(page.id) ?? [])].reverse(),
      );
    }
  }
  return visibleIds;
};

export const toggleBureauSelection = ({
  selectedIds,
  pageId,
  anchorId,
  visibleIds,
  extend,
}: {
  selectedIds: string[];
  pageId: string;
  anchorId: string | null;
  visibleIds: string[];
  extend: boolean;
}) => {
  const startIndex = anchorId === null ? -1 : visibleIds.indexOf(anchorId);
  const endIndex = visibleIds.indexOf(pageId);
  if (extend && startIndex >= 0 && endIndex >= 0) {
    return [
      ...new Set([
        ...selectedIds,
        ...visibleIds.slice(
          Math.min(startIndex, endIndex),
          Math.max(startIndex, endIndex) + 1,
        ),
      ]),
    ];
  }
  return selectedIds.includes(pageId)
    ? selectedIds.filter((selectedId) => selectedId !== pageId)
    : [...selectedIds, pageId];
};
