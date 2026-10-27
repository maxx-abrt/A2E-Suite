import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { getBureauAncestors } from '@/bureau/utils/getBureauAncestors';
import { getBureauSelectionRoots } from '@/bureau/utils/getBureauSelection';
import { getBureauDescendantIds } from '@/bureau/utils/getBureauDescendantIds';
import { Select } from '@/ui/input/components/Select';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPanel = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

export const BureauBulkActions = () => {
  const { t } = useLingui();
  const {
    selectedPageIds,
    isSelectingPages,
    clearPageSelection,
    selectAllPages,
    tree,
    actions,
    permissions,
    isLoading,
    error,
    isBulkActionPending,
    setIsBulkActionPending,
    setTrashingPageIds,
  } = useBureauWorkspace();
  const [destinationId, setDestinationId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  // Native drops and repeated clicks can arrive before the pending state renders.
  // oxlint-disable-next-line twenty/no-state-useref
  const pending = useRef(false);
  if (!isSelectingPages) return null;
  const blockedIds = new Set(
    getBureauSelectionRoots(selectedPageIds, tree).flatMap((pageId) => [
      pageId,
      ...getBureauDescendantIds(pageId, tree.childrenByParentId),
    ]),
  );
  const isDisabled =
    isBulkActionPending || isLoading || !!error || selectedPageIds.length === 0;
  const runAction = async (operation: () => Promise<boolean>) => {
    if (pending.current || isDisabled) return;
    pending.current = true;
    setIsBulkActionPending(true);
    try {
      if (await operation()) clearPageSelection();
    } finally {
      pending.current = false;
      setIsBulkActionPending(false);
    }
  };
  const updatePages = async (update: {
    isFullWidth?: boolean;
    isSmallText?: boolean;
  }) => {
    for (const pageId of selectedPageIds) {
      if (!(await actions.updatePage(pageId, update))) return false;
    }
    return true;
  };
  return (
    <StyledPanel aria-label={t`Selected pages`} aria-busy={isBulkActionPending}>
      <span role="status">{t`${selectedPageIds.length} selected`}</span>
      <StyledActions>
        <Button
          title={t`Select all`}
          ariaLabel={t`Select all`}
          size="small"
          variant="secondary"
          disabled={isBulkActionPending || isLoading || !!error}
          onClick={selectAllPages}
        />
        <Button
          title={t`Done`}
          ariaLabel={t`Done`}
          size="small"
          variant="tertiary"
          disabled={isBulkActionPending}
          onClick={clearPageSelection}
        />
      </StyledActions>
      {permissions.canUpdateObjectRecords && (
        <>
          <StyledActions>
            <Button
              title={t`Move to…`}
              ariaLabel={t`Move to…`}
              size="small"
              variant="secondary"
              disabled={isDisabled}
              onClick={() => setIsMoving(!isMoving)}
            />
            <Button
              title={t`Full width`}
              ariaLabel={t`Full width`}
              size="small"
              variant="tertiary"
              disabled={isDisabled}
              onClick={() =>
                void runAction(() => updatePages({ isFullWidth: true }))
              }
            />
            <Button
              title={t`Standard width`}
              ariaLabel={t`Standard width`}
              size="small"
              variant="tertiary"
              disabled={isDisabled}
              onClick={() =>
                void runAction(() => updatePages({ isFullWidth: false }))
              }
            />
            <Button
              title={t`Small text`}
              ariaLabel={t`Small text`}
              size="small"
              variant="tertiary"
              disabled={isDisabled}
              onClick={() =>
                void runAction(() => updatePages({ isSmallText: true }))
              }
            />
            <Button
              title={t`Standard text`}
              ariaLabel={t`Standard text`}
              size="small"
              variant="tertiary"
              disabled={isDisabled}
              onClick={() =>
                void runAction(() => updatePages({ isSmallText: false }))
              }
            />
          </StyledActions>
          {isMoving && (
            <>
              <Select
                dropdownId="bureau-bulk-destination"
                label={t`Move into`}
                fullWidth
                withSearchInput
                disabled={isDisabled}
                value={destinationId}
                options={[
                  { value: '', label: t`Bureau (top level)` },
                  ...[...tree.documentsById.values()]
                    .filter((page) => !blockedIds.has(page.id))
                    .map((page) => ({
                      value: page.id,
                      label: [
                        ...getBureauAncestors(page.id, tree).map(
                          (ancestor) => ancestor.title?.trim() || t`Untitled`,
                        ),
                        page.title?.trim() || t`Untitled`,
                      ].join(' / '),
                    })),
                ]}
                onChange={setDestinationId}
              />
              <Button
                title={t`Move pages`}
                ariaLabel={t`Move pages`}
                size="small"
                variant="secondary"
                disabled={
                  isDisabled ||
                  blockedIds.has(destinationId) ||
                  (destinationId !== '' &&
                    !tree.documentsById.has(destinationId))
                }
                onClick={() =>
                  void runAction(async () => {
                    const movedIds = await actions.movePages(
                      selectedPageIds,
                      destinationId || null,
                      'inside',
                    );
                    return (
                      movedIds.length > 0 &&
                      selectedPageIds.every(
                        (pageId) =>
                          movedIds.includes(pageId) ||
                          movedIds.some((movedId) =>
                            getBureauDescendantIds(
                              movedId,
                              tree.childrenByParentId,
                            ).includes(pageId),
                          ),
                      )
                    );
                  })
                }
              />
            </>
          )}
        </>
      )}
      {permissions.canSoftDeleteObjectRecords && (
        <Button
          title={t`Move to trash`}
          ariaLabel={t`Move to trash`}
          size="small"
          accent="danger"
          variant="secondary"
          disabled={isDisabled}
          onClick={() =>
            void runAction(async () => {
              setTrashingPageIds([...blockedIds]);
              try {
                return await actions.trashPages(selectedPageIds);
              } finally {
                setTrashingPageIds([]);
              }
            })
          }
        />
      )}
      <small>{t`Moving or trashing a page includes its sub-pages.`}</small>
    </StyledPanel>
  );
};
