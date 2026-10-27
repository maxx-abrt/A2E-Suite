import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type BureauDropZone } from '@/bureau/types/BureauDropZone';
import { type BureauTree } from '@/bureau/types/BureauTree';
import { useRef } from 'react';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { getBureauSelectionRoots } from '@/bureau/utils/getBureauSelection';
import { getBureauAppendPosition } from '@/bureau/utils/getBureauAppendPosition';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';
import { getBureauDropPlacement } from '@/bureau/utils/getBureauDropPlacement';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useDeleteManyRecords } from '@/object-record/hooks/useDeleteManyRecords';
import { useDestroyOneRecord } from '@/object-record/hooks/useDestroyOneRecord';
import { useRestoreManyRecords } from '@/object-record/hooks/useRestoreManyRecords';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { DOCUMENT_OBJECT_NAME_SINGULAR } from '@/quick-capture/utils/newPageDocument';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useLingui } from '@lingui/react/macro';
import { useNavigate } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type BureauPageUpdateInput = Partial<
  Pick<
    BureauDocument,
    'title' | 'icon' | 'coverColor' | 'coverImage' | 'parentId' | 'position'
  >
> & { isFullWidth?: boolean; isSmallText?: boolean };

export const useBureauPageActions = ({
  tree,
  activeDocumentId,
  resyncDocuments,
  expandPageIds,
  isTreeLoading = false,
}: {
  tree: BureauTree;
  activeDocumentId: string | null;
  resyncDocuments: () => void;
  expandPageIds: (pageIds: string[]) => void;
  isTreeLoading?: boolean;
}) => {
  const { t } = useLingui();
  // Native drops and repeated clicks can arrive before the pending state renders.
  // oxlint-disable-next-line twenty/no-state-useref
  const mutationPending = useRef(false);
  const navigate = useNavigate();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
    recordGqlFields: BUREAU_TREE_RECORD_GQL_FIELDS,
    shouldMatchRootQueryFilter: true,
  });
  const { updateOneRecord } = useUpdateOneRecord();
  const { deleteManyRecords } = useDeleteManyRecords({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
  });
  const { restoreManyRecords } = useRestoreManyRecords({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
  });
  const { destroyOneRecord } = useDestroyOneRecord({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
  });

  const updatePage = async (
    documentId: string,
    updateInput: BureauPageUpdateInput,
  ) => {
    try {
      await updateOneRecord({
        objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
        idToUpdate: documentId,
        updateOneRecordInput: updateInput,
        recordGqlFields: {
          ...BUREAU_TREE_RECORD_GQL_FIELDS,
          isFullWidth: true,
          isSmallText: true,
        },
      });
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not save the page. Please try again.`,
      });

      return false;
    }

    return true;
  };

  const createPage = async ({
    parentId = null,
  }: { parentId?: string | null } = {}) => {
    const siblings = tree.childrenByParentId.get(parentId) ?? [];

    try {
      const createdPage = await createOneRecord({
        title: '',
        kind: 'DOCUMENT',
        parentId,
        position: getBureauAppendPosition(siblings),
      });

      if (isDefined(parentId)) {
        expandPageIds([parentId]);
      }

      resyncDocuments();
      navigate(getBureauPagePath(createdPage.id));

      return createdPage.id;
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not create the page. Please try again.`,
      });

      return null;
    }
  };

  const movePages = async (
    pageIds: string[],
    targetId: string | null,
    zone: BureauDropZone,
  ) => {
    if (mutationPending.current || isTreeLoading) {
      enqueueErrorSnackBar({
        message: t`Please wait until all pages have loaded and the current action has finished.`,
      });
      return [];
    }
    const roots = getBureauSelectionRoots(pageIds, tree);
    if (
      roots.length === 0 ||
      roots.some(
        (pageId) =>
          !getBureauDropPlacement({ draggedId: pageId, targetId, zone, tree }),
      )
    )
      return [];
    mutationPending.current = true;
    const movedIds: string[] = [];
    let workingTree = tree;
    // Recompute positions after every save: a bulk move must not give all siblings the same position.
    try {
      for (const pageId of zone === 'after' ? [...roots].reverse() : roots) {
        const placement = getBureauDropPlacement({
          draggedId: pageId,
          targetId,
          zone,
          tree: workingTree,
        });
        if (!placement) break;
        let didSaveSiblings = true;
        for (const sibling of placement.siblingRepositions) {
          if (!(await updatePage(sibling.id, { position: sibling.position }))) {
            didSaveSiblings = false;
            break;
          }
          workingTree = buildBureauTree(
            [...workingTree.documentsById.values()].map((page) =>
              page.id === sibling.id
                ? { ...page, position: sibling.position }
                : page,
            ),
          );
        }
        if (
          !didSaveSiblings ||
          !(await updatePage(pageId, {
            parentId: placement.parentId,
            position: placement.position,
          }))
        )
          break;
        movedIds.push(pageId);
        workingTree = buildBureauTree(
          [...workingTree.documentsById.values()].map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  parentId: placement.parentId,
                  position: placement.position,
                }
              : page,
          ),
        );
        if (isDefined(placement.parentId)) expandPageIds([placement.parentId]);
      }
    } finally {
      mutationPending.current = false;
      resyncDocuments();
    }
    if (movedIds.length > 0 && movedIds.length < roots.length) {
      enqueueErrorSnackBar({
        message: t`Some pages moved. Review their locations before retrying the remaining pages.`,
      });
    }
    return movedIds;
  };

  const movePage = async (
    pageId: string,
    targetId: string | null,
    zone: BureauDropZone,
  ) => movePages([pageId], targetId, zone);

  const restorePageIds = async (pageIds: string[]) => {
    await restoreManyRecords({ idsToRestore: pageIds });
    resyncDocuments();
  };

  // A page goes to the trash with its whole subtree, so no child is left
  // pointing at a trashed parent.
  const trashPages = async (documentIds: string[]) => {
    if (isTreeLoading || mutationPending.current) {
      enqueueErrorSnackBar({
        message: t`Please wait until all pages have loaded and the current action has finished.`,
      });
      return false;
    }
    const roots = getBureauSelectionRoots(documentIds, tree);
    const pageIds = [
      ...new Set(
        roots.flatMap((pageId) => [
          pageId,
          ...getBureauDescendantIds(pageId, tree.childrenByParentId),
        ]),
      ),
    ];
    if (pageIds.length === 0) return false;
    mutationPending.current = true;
    try {
      const deletedRecords = await deleteManyRecords({
        recordIdsToDelete: [...pageIds].reverse(),
        skipOptimisticEffect: true,
      });
      if (
        new Set(deletedRecords.map((record) => record.id)).size !==
        pageIds.length
      ) {
        throw new Error('The server did not delete every requested page');
      }
    } catch {
      resyncDocuments();
      enqueueErrorSnackBar({
        message: t`The action could not finish. Some pages may have moved to the trash. Check the trash before retrying.`,
        options: {
          buttonLabel: t`Undo`,
          buttonOnClick: () => {
            void restorePageIds(pageIds).catch(() =>
              enqueueErrorSnackBar({
                message: t`Could not restore the pages. Please try again from the trash.`,
              }),
            );
          },
        },
      });
      return false;
    } finally {
      mutationPending.current = false;
    }

    resyncDocuments();

    if (isDefined(activeDocumentId) && pageIds.includes(activeDocumentId)) {
      navigate(AppPath.Bureau);
    }

    enqueueSuccessSnackBar({
      message:
        pageIds.length === 1
          ? t`Page moved to the trash`
          : t`${pageIds.length} pages moved to the trash`,
      options: {
        buttonLabel: t`Undo`,
        buttonOnClick: () => {
          void restorePageIds(pageIds).catch(() => {
            enqueueErrorSnackBar({
              message: t`Could not restore the page. Please try again.`,
            });
          });
        },
      },
    });

    return true;
  };

  const trashPage = async (documentId: string) => trashPages([documentId]);

  // Restores a trashed page with its trashed subtree; a page whose parent is
  // gone is re-homed at the root instead of disappearing from the tree.
  const restorePage = async (
    trashedPage: BureauDocument,
    trashedPages: BureauDocument[],
  ) => {
    if (isTreeLoading) {
      enqueueErrorSnackBar({
        message: t`Please wait until all pages have loaded.`,
      });
      return false;
    }
    const trashedChildrenByParentId = new Map<
      string | null,
      BureauDocument[]
    >();

    for (const page of trashedPages) {
      const siblings = trashedChildrenByParentId.get(page.parentId) ?? [];
      siblings.push(page);
      trashedChildrenByParentId.set(page.parentId, siblings);
    }

    const pageIds = [
      trashedPage.id,
      ...getBureauDescendantIds(trashedPage.id, trashedChildrenByParentId),
    ];

    try {
      await restoreManyRecords({ idsToRestore: pageIds });

      if (
        isDefined(trashedPage.parentId) &&
        !tree.documentsById.has(trashedPage.parentId)
      ) {
        await updatePage(trashedPage.id, {
          parentId: null,
          position: getBureauAppendPosition(
            tree.childrenByParentId.get(null) ?? [],
          ),
        });
      }
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not restore the page. Please try again.`,
      });

      return false;
    }

    resyncDocuments();

    return true;
  };

  const destroyPage = async (documentId: string) => {
    try {
      await destroyOneRecord(documentId);

      return true;
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not delete the page. Please try again.`,
      });

      return false;
    }
  };

  return {
    createPage,
    updatePage,
    movePage,
    movePages,
    trashPage,
    trashPages,
    restorePage,
    destroyPage,
  };
};
