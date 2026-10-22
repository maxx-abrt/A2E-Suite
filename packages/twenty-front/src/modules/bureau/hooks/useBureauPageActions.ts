import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type BureauDropZone } from '@/bureau/types/BureauDropZone';
import { type BureauTree } from '@/bureau/types/BureauTree';
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
}: {
  tree: BureauTree;
  activeDocumentId: string | null;
  resyncDocuments: () => void;
  expandPageIds: (pageIds: string[]) => void;
}) => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const { createOneRecord } = useCreateOneRecord<BureauDocument>({
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
      });
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not save the page. Please try again.`,
      });
    }
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

  const movePage = async (
    draggedId: string,
    targetId: string | null,
    zone: BureauDropZone,
  ) => {
    const placement = getBureauDropPlacement({
      draggedId,
      targetId,
      zone,
      tree,
    });

    if (!isDefined(placement)) {
      return;
    }

    const draggedPage = tree.documentsById.get(draggedId);

    if (
      draggedPage?.parentId === placement.parentId &&
      draggedPage?.position === placement.position &&
      placement.siblingRepositions.length === 0
    ) {
      return;
    }

    for (const siblingReposition of placement.siblingRepositions) {
      await updatePage(siblingReposition.id, {
        position: siblingReposition.position,
      });
    }

    await updatePage(draggedId, {
      parentId: placement.parentId,
      position: placement.position,
    });

    if (isDefined(placement.parentId)) {
      expandPageIds([placement.parentId]);
    }
  };

  const restorePageIds = async (pageIds: string[]) => {
    await restoreManyRecords({ idsToRestore: pageIds });
    resyncDocuments();
  };

  // A page goes to the trash with its whole subtree, so no child is left
  // pointing at a trashed parent.
  const trashPage = async (documentId: string) => {
    const pageIds = [
      documentId,
      ...getBureauDescendantIds(documentId, tree.childrenByParentId),
    ];

    try {
      await deleteManyRecords({ recordIdsToDelete: pageIds });
    } catch {
      enqueueErrorSnackBar({
        message: t`Could not move the page to the trash. Please try again.`,
      });

      return;
    }

    resyncDocuments();

    if (isDefined(activeDocumentId) && pageIds.includes(activeDocumentId)) {
      navigate(AppPath.Bureau);
    }

    enqueueSuccessSnackBar({
      message: t`Page moved to the trash`,
      options: {
        buttonLabel: t`Undo`,
        buttonOnClick: () => {
          void restorePageIds(pageIds);
        },
      },
    });
  };

  // Restores a trashed page with its trashed subtree; a page whose parent is
  // gone is re-homed at the root instead of disappearing from the tree.
  const restorePage = async (
    trashedPage: BureauDocument,
    trashedPages: BureauDocument[],
  ) => {
    const trashedChildrenByParentId = new Map<string | null, BureauDocument[]>();

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
    trashPage,
    restorePage,
    destroyPage,
  };
};
