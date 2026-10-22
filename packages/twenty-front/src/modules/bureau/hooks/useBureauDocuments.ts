import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { DOCUMENT_OBJECT_NAME_SINGULAR } from '@/quick-capture/utils/newPageDocument';
import { useListenToSidePanelClosing } from '@/ui/layout/side-panel/hooks/useListenToSidePanelClosing';
import { useEffect, useMemo } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { useDebouncedCallback } from 'use-debounce';

const BUREAU_TREE_RESYNC_DEBOUNCE_IN_MS = 400;

// Every live page of the workspace (paged in full), shaped as a tree. Writes
// made through Apollo update the list optimistically; pages created outside
// it (template gallery, other tabs) are picked up on side-panel close, window
// focus and record operation events.
export const useBureauDocuments = () => {
  const {
    records,
    loading,
    error,
    refetch,
    hasNextPage,
    fetchMoreRecords,
    objectMetadataItem,
  } = useFindManyRecords<BureauDocument>({
    objectNameSingular: DOCUMENT_OBJECT_NAME_SINGULAR,
    recordGqlFields: BUREAU_TREE_RECORD_GQL_FIELDS,
    orderBy: [{ position: 'AscNullsFirst' }],
    limit: QUERY_MAX_RECORDS,
  });

  useEffect(() => {
    if (hasNextPage === true && !loading) {
      void fetchMoreRecords();
    }
  }, [fetchMoreRecords, hasNextPage, loading]);

  const resyncDocuments = useDebouncedCallback(() => {
    void refetch();
  }, BUREAU_TREE_RESYNC_DEBOUNCE_IN_MS);

  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: objectMetadataItem.id,
    operationTypes: [
      'create-one',
      'create-many',
      'delete-one',
      'delete-many',
      'restore-one',
      'restore-many',
      'destroy-one',
      'destroy-many',
    ],
    onObjectRecordOperationBrowserEvent: resyncDocuments,
  });

  useListenToSidePanelClosing(resyncDocuments);

  useEffect(() => {
    window.addEventListener('focus', resyncDocuments);

    return () => {
      window.removeEventListener('focus', resyncDocuments);
    };
  }, [resyncDocuments]);

  const tree = useMemo(() => buildBureauTree(records), [records]);

  return {
    documents: records,
    tree,
    isLoading: loading && records.length === 0,
    error,
    resyncDocuments,
  };
};
