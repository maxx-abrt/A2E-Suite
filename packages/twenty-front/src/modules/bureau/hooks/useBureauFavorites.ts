import { currentUserState } from '@/auth/states/currentUserState';
import { BUREAU_FAVORITE_OBJECT_NAME_SINGULAR } from '@/bureau/constants/BureauFavoriteObjectNameSingular';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { useDestroyOneRecord } from '@/object-record/hooks/useDestroyOneRecord';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useMemo } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';

type BureauFavoriteRecord = {
  __typename?: string;
  id: string;
  documentId: string | null;
};

// Personal favorites (one `documentFavorite` per member and page), the same
// records the a2e-documents browser reads, so both surfaces stay in sync.
export const useBureauFavorites = () => {
  const { t } = useLingui();
  const currentUser = useAtomStateValue(currentUserState);
  const userId = currentUser?.id;
  const { enqueueErrorSnackBar } = useSnackBar();

  const { records, refetch } = useFindManyRecords<BureauFavoriteRecord>({
    objectNameSingular: BUREAU_FAVORITE_OBJECT_NAME_SINGULAR,
    filter: { userId: { eq: userId ?? '' } },
    recordGqlFields: { id: true, documentId: true },
    limit: QUERY_MAX_RECORDS,
    skip: !isDefined(userId),
  });

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: BUREAU_FAVORITE_OBJECT_NAME_SINGULAR,
    shouldMatchRootQueryFilter: true,
  });
  const { destroyOneRecord } = useDestroyOneRecord({
    objectNameSingular: BUREAU_FAVORITE_OBJECT_NAME_SINGULAR,
  });

  const favoriteIdByDocumentId = useMemo(
    () =>
      new Map(
        records
          .filter((record) => isDefined(record.documentId))
          .map((record) => [record.documentId as string, record.id]),
      ),
    [records],
  );

  const favoriteDocumentIds = useMemo(
    () => new Set(favoriteIdByDocumentId.keys()),
    [favoriteIdByDocumentId],
  );

  const toggleFavorite = useCallback(
    async (documentId: string) => {
      if (!isDefined(userId)) {
        return;
      }

      const favoriteId = favoriteIdByDocumentId.get(documentId);

      try {
        if (isDefined(favoriteId)) {
          await destroyOneRecord(favoriteId);
        } else {
          await createOneRecord({
            favoriteKey: `${userId}:${documentId}`,
            userId,
            documentId,
          });
        }
      } catch {
        enqueueErrorSnackBar({
          message: t`Could not update your favorites. Please try again.`,
        });
      } finally {
        await refetch();
      }
    },
    [
      createOneRecord,
      destroyOneRecord,
      enqueueErrorSnackBar,
      favoriteIdByDocumentId,
      refetch,
      t,
      userId,
    ],
  );

  return { favoriteDocumentIds, toggleFavorite };
};
