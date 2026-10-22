import { BureauModal } from '@/bureau/components/BureauModal';
import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { BUREAU_TRASH_MODAL_ID } from '@/bureau/constants/BureauTrashModalId';
import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { IconTrash } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRow = styled.div`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  span {
    flex: 1;
    overflow-wrap: anywhere;
  }
`;

export const BureauTrashModal = () => (
  <BureauModal modalId={BUREAU_TRASH_MODAL_ID}>
    <BureauTrashContent />
  </BureauModal>
);

const BureauTrashContent = () => {
  const { t } = useLingui();
  const { actions, permissions } = useBureauWorkspace();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const { records, loading, error, refetch, hasNextPage, fetchMoreRecords } =
    useFindManyRecords<BureauDocument>({
      objectNameSingular: 'document',
      filter: { deletedAt: { is: 'NOT_NULL' } },
      recordGqlFields: BUREAU_TREE_RECORD_GQL_FIELDS,
      orderBy: [{ deletedAt: 'DescNullsLast' }],
      fetchPolicy: 'network-only',
      withSoftDeleted: true,
      limit: QUERY_MAX_RECORDS,
    });

  // Restore needs the complete trashed subtree, including later query pages.
  useEffect(() => {
    if (hasNextPage && !loading) {
      void fetchMoreRecords();
    }
  }, [hasNextPage, loading, fetchMoreRecords]);

  const restore = async (page: BureauDocument) => {
    setPendingId(page.id);
    try {
      if (await actions.restorePage(page, records)) await refetch();
    } finally {
      setPendingId(null);
    }
  };

  const destroy = async (page: BureauDocument) => {
    setPendingId(page.id);
    try {
      if (await actions.destroyPage(page.id)) {
        setConfirmId(null);
        await refetch();
      }
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <h2>{t`Trash`}</h2>
      <p>{t`Restore a page and its sub-pages, or permanently delete a page.`}</p>
      {loading && <p role="status">{t`Loading trash…`}</p>}
      {error && (
        <Button
          title={t`Could not load trash. Retry`}
          onClick={() => {
            void refetch();
          }}
        />
      )}
      {!loading && !error && records.length === 0 && <p>{t`Trash is empty`}</p>}
      {records.map((page) => (
        <StyledRow key={page.id}>
          <BureauPageIcon icon={page.icon} />
          <span>{page.title?.trim() || t`Untitled`}</span>
          {confirmId === page.id ? (
            <>
              <p>{t`Permanently delete this page and all its sub-pages? This cannot be undone.`}</p>
              <Button
                title={t`Cancel`}
                variant="secondary"
                disabled={pendingId !== null}
                onClick={() => setConfirmId(null)}
              />
              <Button
                title={t`Delete forever`}
                accent="danger"
                disabled={pendingId !== null}
                onClick={() => {
                  void destroy(page);
                }}
              />
            </>
          ) : (
            <>
              {permissions.canSoftDeleteObjectRecords && (
                <Button
                  title={t`Restore`}
                  variant="secondary"
                  disabled={
                    pendingId !== null || loading || hasNextPage === true
                  }
                  onClick={() => {
                    void restore(page);
                  }}
                />
              )}
              {permissions.canDestroyObjectRecords && (
                <Button
                  title={t`Delete forever`}
                  Icon={IconTrash}
                  variant="tertiary"
                  disabled={pendingId !== null}
                  onClick={() => setConfirmId(page.id)}
                />
              )}
            </>
          )}
        </StyledRow>
      ))}
    </>
  );
};
