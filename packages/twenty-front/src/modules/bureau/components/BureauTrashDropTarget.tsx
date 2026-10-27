import { BureauSidebarAction } from '@/bureau/components/BureauSidebarAction';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';
import { getBureauSelectionRoots } from '@/bureau/utils/getBureauSelection';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTarget = styled.div`
  border: 1px solid transparent;
  border-radius: ${themeCssVariables.border.radius.sm};
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
  &[data-dragging='true'],
  &[data-pending='true'] {
    background: ${themeCssVariables.background.primary};
    bottom: 0;
    position: sticky;
    z-index: 1;
    border-color: ${themeCssVariables.border.color.medium};
  }
  &[data-over='true'] {
    background: ${themeCssVariables.background.transparent.danger};
    border-color: ${themeCssVariables.color.red};
    transform: scale(1.02);
  }
  &[data-pending='true'] svg {
    transform: translateY(2px) scale(0.85);
  }
  svg {
    transition: transform 160ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    & svg {
      transition: none;
      transform: none;
    }
  }
`;

export const BureauTrashDropTarget = () => {
  const { t } = useLingui();
  const {
    draggedPageIds,
    tree,
    setTrashingPageIds,
    trashingPageIds,
    setDraggedPageId,
    actions,
    openTrash,
    permissions,
    isLoading,
    error,
    isBulkActionPending,
    setIsBulkActionPending,
    clearPageSelection,
  } = useBureauWorkspace();
  const [isOver, setIsOver] = useState(false);
  // Native drops and repeated clicks can arrive before the pending state renders.
  // oxlint-disable-next-line twenty/no-state-useref
  const pending = useRef(false);
  const isTrashingPages = trashingPageIds.length > 0;
  const canDrop =
    permissions.canSoftDeleteObjectRecords &&
    !isLoading &&
    !error &&
    !isBulkActionPending &&
    draggedPageIds.length > 0;
  return (
    <StyledTarget
      data-testid="bureau-trash-drop-target"
      data-dragging={canDrop}
      data-over={canDrop && isOver}
      data-pending={isTrashingPages}
      aria-busy={isTrashingPages}
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setIsOver(false);
      }}
      onDrop={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);
        if (!canDrop || pending.current) return;
        const pageIds = [...draggedPageIds];
        pending.current = true;
        setIsBulkActionPending(true);
        setTrashingPageIds(
          getBureauSelectionRoots(pageIds, tree).flatMap((pageId) => [
            pageId,
            ...getBureauDescendantIds(pageId, tree.childrenByParentId),
          ]),
        );
        setDraggedPageId(null);
        try {
          if (await actions.trashPages(pageIds)) clearPageSelection();
        } finally {
          setTrashingPageIds([]);
          pending.current = false;
          setIsBulkActionPending(false);
        }
      }}
    >
      <BureauSidebarAction
        Icon={IconTrash}
        label={
          isTrashingPages
            ? t`Moving pages…`
            : canDrop && isOver
              ? t`Drop to move to trash`
              : t`Trash`
        }
        testId="bureau-trash"
        onClick={openTrash}
      />
    </StyledTarget>
  );
};
