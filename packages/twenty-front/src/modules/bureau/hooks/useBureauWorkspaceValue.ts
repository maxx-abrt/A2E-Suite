import { BUREAU_SEARCH_MODAL_ID } from '@/bureau/constants/BureauSearchModalId';
import { BUREAU_TRASH_MODAL_ID } from '@/bureau/constants/BureauTrashModalId';
import { useBureauDocuments } from '@/bureau/hooks/useBureauDocuments';
import { useBureauFavorites } from '@/bureau/hooks/useBureauFavorites';
import { useBureauPageActions } from '@/bureau/hooks/useBureauPageActions';
import { bureauExpandedPageIdsState } from '@/bureau/states/bureauExpandedPageIdsState';
import { getBureauAncestors } from '@/bureau/utils/getBureauAncestors';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

export const useBureauWorkspaceValue = (activeDocumentId: string | null) => {
  const { documents, tree, isLoading, resyncDocuments } = useBureauDocuments();
  const { favoriteDocumentIds, toggleFavorite } = useBureauFavorites();
  const [bureauExpandedPageIds, setBureauExpandedPageIds] = useAtomState(
    bureauExpandedPageIdsState,
  );
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const { openModal } = useModal();

  const expandPageIds = useCallback(
    (pageIds: string[]) => {
      setBureauExpandedPageIds((previousPageIds) => {
        const missingPageIds = pageIds.filter(
          (pageId) => !previousPageIds.includes(pageId),
        );

        return missingPageIds.length > 0
          ? [...previousPageIds, ...missingPageIds]
          : previousPageIds;
      });
    },
    [setBureauExpandedPageIds],
  );

  const toggleExpandedPageId = useCallback(
    (pageId: string) => {
      setBureauExpandedPageIds((previousPageIds) =>
        previousPageIds.includes(pageId)
          ? previousPageIds.filter((expandedId) => expandedId !== pageId)
          : [...previousPageIds, pageId],
      );
    },
    [setBureauExpandedPageIds],
  );

  // Opening a page (link, search, breadcrumb) always reveals it in the tree.
  useEffect(() => {
    if (!isDefined(activeDocumentId)) {
      return;
    }

    const ancestorIds = getBureauAncestors(activeDocumentId, tree).map(
      (ancestor) => ancestor.id,
    );

    if (ancestorIds.length > 0) {
      expandPageIds(ancestorIds);
    }
  }, [activeDocumentId, expandPageIds, tree]);

  const actions = useBureauPageActions({
    tree,
    activeDocumentId,
    resyncDocuments,
    expandPageIds,
  });

  const favoriteDocuments = useMemo(
    () =>
      [...favoriteDocumentIds]
        .map((documentId) => tree.documentsById.get(documentId))
        .filter(isDefined),
    [favoriteDocumentIds, tree],
  );

  // A page can never be dropped onto itself or anywhere inside its subtree.
  const invalidDropTargetIds = useMemo(
    () =>
      isDefined(draggedPageId)
        ? new Set([
            draggedPageId,
            ...getBureauDescendantIds(draggedPageId, tree.childrenByParentId),
          ])
        : new Set<string>(),
    [draggedPageId, tree],
  );

  const openSearch = useCallback(
    () => openModal(BUREAU_SEARCH_MODAL_ID),
    [openModal],
  );
  const openTrash = useCallback(
    () => openModal(BUREAU_TRASH_MODAL_ID),
    [openModal],
  );

  return {
    activeDocumentId,
    documents,
    tree,
    isLoading,
    favoriteDocumentIds,
    favoriteDocuments,
    toggleFavorite,
    expandedPageIds: bureauExpandedPageIds,
    expandPageIds,
    toggleExpandedPageId,
    draggedPageId,
    setDraggedPageId,
    invalidDropTargetIds,
    actions,
    openSearch,
    openTrash,
  };
};
