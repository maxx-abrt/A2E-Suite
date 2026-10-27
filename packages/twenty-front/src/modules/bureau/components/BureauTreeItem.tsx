import { BureauPageActionsDropdown } from '@/bureau/components/BureauPageActionsDropdown';
import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { useBureauTextInputFocus } from '@/bureau/hooks/useBureauTextInputFocus';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { isNavigationDrawerExpandedState } from '@/ui/navigation/states/isNavigationDrawerExpanded';
import { useIsMobile } from '@/ui/utilities/responsive/hooks/useIsMobile';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { type BureauDropZone } from '@/bureau/types/BureauDropZone';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { IconChevronRight, IconPlus } from 'twenty-ui/icon';
import { Checkbox, LightIconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[0.5]};
  opacity: 0;
  transition: opacity calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;
`;

const StyledRow = styled.div`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[1]};
  height: ${themeCssVariables.spacing[7]};
  padding-left: calc(
    ${themeCssVariables.spacing[1]} + var(--bureau-tree-depth, 0) *
      ${themeCssVariables.spacing[3]}
  );
  padding-right: ${themeCssVariables.spacing[1]};
  position: relative;
  transition:
    background 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
  user-select: none;

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.light};
    outline: none;
  }

  &:hover ${StyledRowActions}, &:focus-within ${StyledRowActions} {
    opacity: 1;
  }

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }

  &[data-dragging='true'] {
    opacity: 0.4;
  }
  &[data-trashing='true'] {
    opacity: 0.25;
    transform: translateX(8px) scale(0.98);
    pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none !important;
  }

  &[data-drop-zone='inside'] {
    background: ${themeCssVariables.background.transparent.blue};
    box-shadow: inset 0 0 0 1px ${themeCssVariables.border.color.blue};
  }

  &[data-drop-zone='before']::before,
  &[data-drop-zone='after']::after {
    background: ${themeCssVariables.border.color.blue};
    border-radius: ${themeCssVariables.border.radius.xs};
    content: '';
    height: 2px;
    left: calc(
      ${themeCssVariables.spacing[1]} + var(--bureau-tree-depth, 0) *
        ${themeCssVariables.spacing[3]}
    );
    pointer-events: none;
    position: absolute;
    right: 0;
  }

  &[data-drop-zone='before']::before {
    top: -1px;
  }

  &[data-drop-zone='after']::after {
    bottom: -1px;
  }
`;

const StyledToggle = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  height: ${themeCssVariables.spacing[5]};
  justify-content: center;
  padding: 0;
  width: ${themeCssVariables.spacing[5]};

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.primary};
    outline: none;
  }

  & svg {
    transition: transform
      calc(${themeCssVariables.animation.duration.fast} * 1s) ease;
  }

  &[data-expanded='true'] svg {
    transform: rotate(90deg);
  }
`;

const StyledTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &[data-untitled='true'] {
    color: ${themeCssVariables.font.color.tertiary};
  }
`;

const StyledRenameInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.blue};
  border-radius: ${themeCssVariables.border.radius.xs};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  height: ${themeCssVariables.spacing[6]};
  min-width: 0;
  outline: none;
  padding: 0 ${themeCssVariables.spacing[1]};
`;

const StyledGroup = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledEmptyChildren = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  height: ${themeCssVariables.spacing[6]};
  line-height: ${themeCssVariables.spacing[6]};
  padding-left: calc(
    ${themeCssVariables.spacing[7]} + var(--bureau-tree-depth, 0) *
      ${themeCssVariables.spacing[3]}
  );
`;

const getDropZoneFromPointer = (event: DragEvent<HTMLElement>) => {
  const rowRect = event.currentTarget.getBoundingClientRect();
  const pointerRatio = (event.clientY - rowRect.top) / rowRect.height;

  if (pointerRatio < 0.25) {
    return 'before';
  }

  return pointerRatio > 0.75 ? 'after' : 'inside';
};

type BureauTreeItemProps = {
  page: BureauDocument;
  depth: number;
  section: 'pages' | 'favorites';
};

export const BureauTreeItem = ({
  page,
  depth,
  section,
}: BureauTreeItemProps) => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const setIsNavigationDrawerExpanded = useSetAtomState(
    isNavigationDrawerExpandedState,
  );
  const {
    tree,
    activeDocumentId,
    expandedPageIds,
    toggleExpandedPageId,
    draggedPageIds,
    trashingPageIds,
    moveDraggedPages,
    selectedPageIds,
    togglePageSelection,
    clearPageSelection,
    selectAllPages,
    isSelectingPages,
    isBulkActionPending,
    isLoading,
    error,
    draggedPageId,
    setDraggedPageId,
    invalidDropTargetIds,
    actions,
    permissions,
  } = useBureauWorkspace();
  const [dropZone, setDropZone] = useState<BureauDropZone | null>(null);
  const [renameDraft, setRenameDraft] = useState<string | null>(null);
  const renameFocusId = `bureau-tree-rename-${section}-${page.id}`;
  const { handleFocus, handleBlur } = useBureauTextInputFocus(renameFocusId);

  const isTreeSection = section === 'pages';
  const childPages = tree.childrenByParentId.get(page.id) ?? [];
  // Favorites keep their own expansion so opening a branch there does not
  // unfold the same branch in the page tree.
  const expandedKey = isTreeSection ? page.id : `${section}:${page.id}`;
  const isExpanded = expandedPageIds.includes(expandedKey);
  const isActive = activeDocumentId === page.id;
  const isSelected = isTreeSection && selectedPageIds.includes(page.id);
  const isRenaming = isDefined(renameDraft);
  const pageTitle = page.title?.trim() ?? '';
  const rowStyle = { '--bureau-tree-depth': depth } as CSSProperties;
  const testIdPrefix = `bureau-${section}-item-${page.id}`;

  // The row is a draggable treeitem, so it cannot be a <Link> itself.
  const openPage = () => {
    // oxlint-disable-next-line twenty/no-navigate-prefer-link
    navigate(getBureauPagePath(page.id));
    if (isMobile) setIsNavigationDrawerExpanded(false);
  };

  const startRename = () => {
    if (
      !permissions.canUpdateObjectRecords ||
      isSelectingPages ||
      isBulkActionPending
    )
      return;
    setRenameDraft(page.title ?? '');
  };

  const commitRename = () => {
    if (!isDefined(renameDraft)) {
      return;
    }

    const nextTitle = renameDraft.trim();

    setRenameDraft(null);

    if (nextTitle !== pageTitle) {
      void actions.updatePage(page.id, { title: nextTitle });
    }
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setRenameDraft(null);
    }
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === 'a' &&
      isTreeSection
    ) {
      event.preventDefault();
      selectAllPages();
      return;
    }
    if (event.key === 'Escape' && isSelectingPages && !isBulkActionPending) {
      event.preventDefault();
      clearPageSelection();
      return;
    }
    if (event.target !== event.currentTarget) return;
    if (event.key === ' ' && isTreeSection) {
      event.preventDefault();
      togglePageSelection(page.id, event.shiftKey);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isSelectingPages && isTreeSection)
        togglePageSelection(page.id, event.shiftKey);
      else openPage();
    }

    if (event.key === 'F2') {
      event.preventDefault();
      startRename();
    }

    if (event.key === 'ArrowRight' && !isExpanded) {
      event.preventDefault();
      toggleExpandedPageId(expandedKey);
    }

    if (event.key === 'ArrowLeft' && isExpanded) {
      event.preventDefault();
      toggleExpandedPageId(expandedKey);
    }
  };

  const canAcceptDrop =
    permissions.canUpdateObjectRecords &&
    !isBulkActionPending &&
    !isLoading &&
    !error &&
    isTreeSection &&
    isDefined(draggedPageId) &&
    !invalidDropTargetIds.has(page.id);

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      (isSelected ? selectedPageIds : [page.id]).join('\n'),
    );
    event.dataTransfer.setData('application/x-bureau-pages', page.id);
    setDraggedPageId(page.id);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canAcceptDrop) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const nextDropZone = getDropZoneFromPointer(event);

    if (nextDropZone !== dropZone) {
      setDropZone(nextDropZone);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const zone = dropZone ?? getDropZoneFromPointer(event);

    setDropZone(null);

    if (canAcceptDrop && isDefined(draggedPageId)) {
      void moveDraggedPages(page.id, zone);
    }

    setDraggedPageId(null);
  };

  return (
    <li role="none">
      <StyledRow
        role="treeitem"
        tabIndex={0}
        aria-selected={
          isTreeSection && isSelectingPages ? isSelected : isActive
        }
        aria-expanded={childPages.length > 0 ? isExpanded : undefined}
        aria-level={depth + 1}
        data-active={isSelected || isActive}
        data-trashing={trashingPageIds.includes(page.id)}
        data-dragging={draggedPageIds.includes(page.id)}
        data-drop-zone={canAcceptDrop ? (dropZone ?? undefined) : undefined}
        data-testid={testIdPrefix}
        style={rowStyle}
        draggable={
          isTreeSection &&
          !isRenaming &&
          !isBulkActionPending &&
          !isLoading &&
          !error &&
          (permissions.canUpdateObjectRecords ||
            permissions.canSoftDeleteObjectRecords)
        }
        // oxlint-disable-next-line twenty/no-navigate-prefer-link
        onClick={(event) => {
          if (
            isTreeSection &&
            (isSelectingPages ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey)
          )
            togglePageSelection(page.id, event.shiftKey);
          else openPage();
        }}
        onDoubleClick={() => {
          if (!isSelectingPages && !isBulkActionPending) startRename();
        }}
        onKeyDown={handleRowKeyDown}
        onDragStart={handleDragStart}
        onDragEnd={() => {
          setDraggedPageId(null);
          setDropZone(null);
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropZone(null)}
        onDrop={handleDrop}
      >
        <StyledToggle
          type="button"
          tabIndex={-1}
          data-expanded={isExpanded}
          aria-label={isExpanded ? t`Collapse` : t`Expand`}
          data-testid={`${testIdPrefix}-toggle`}
          onClick={(event) => {
            event.stopPropagation();
            toggleExpandedPageId(expandedKey);
          }}
        >
          <IconChevronRight size={14} stroke={2} />
        </StyledToggle>
        {isTreeSection && isSelectingPages && (
          <span onClick={(event) => event.stopPropagation()}>
            <Checkbox
              aria-label={t`Select ${pageTitle || t`Untitled`}`}
              checked={isSelected}
              disabled={isBulkActionPending}
              onChange={(event) =>
                togglePageSelection(
                  page.id,
                  'shiftKey' in event && event.shiftKey === true,
                )
              }
            />
          </span>
        )}
        <BureauPageIcon icon={page.icon} />
        {isRenaming ? (
          <StyledRenameInput
            autoFocus
            value={renameDraft}
            aria-label={t`Page title`}
            data-testid={`${testIdPrefix}-rename-input`}
            onChange={(event) => setRenameDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onFocus={handleFocus}
            onBlur={() => {
              handleBlur();
              commitRename();
            }}
            onKeyDown={handleRenameKeyDown}
          />
        ) : (
          <StyledTitle data-untitled={pageTitle === ''}>
            {pageTitle === '' ? t`Untitled` : pageTitle}
          </StyledTitle>
        )}
        {!isSelectingPages && !isBulkActionPending && (
          <StyledRowActions
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            <BureauPageActionsDropdown
              page={page}
              dropdownId={`bureau-${section}-item-menu-${page.id}`}
              onRename={startRename}
            />
            {permissions.canUpdateObjectRecords && (
              <LightIconButton
                Icon={IconPlus}
                accent="tertiary"
                size="small"
                aria-label={t`Add a sub-page`}
                testId={`${testIdPrefix}-add`}
                onClick={() => {
                  void actions.createPage({ parentId: page.id });
                }}
              />
            )}
          </StyledRowActions>
        )}
      </StyledRow>
      {isExpanded ? (
        childPages.length > 0 ? (
          <StyledGroup role="group">
            {childPages.map((childPage) => (
              <BureauTreeItem
                key={childPage.id}
                page={childPage}
                depth={depth + 1}
                section={section}
              />
            ))}
          </StyledGroup>
        ) : (
          <StyledEmptyChildren
            style={{ '--bureau-tree-depth': depth + 1 } as CSSProperties}
          >
            {t`No pages inside`}
          </StyledEmptyChildren>
        )
      ) : null}
    </li>
  );
};
