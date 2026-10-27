import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { buildBureauTree } from '@/bureau/utils/buildBureauTree';
import { isDefined } from 'twenty-shared/utils';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { DOCUMENT_OBJECT_NAME_SINGULAR } from '@/quick-capture/utils/newPageDocument';
import { useListenToSidePanelClosing } from '@/ui/layout/side-panel/hooks/useListenToSidePanelClosing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QUERY_MAX_RECORDS } from 'twenty-shared/constants';
import { useDebouncedCallback } from 'use-debounce';

const BUREAU_TREE_RESYNC_DEBOUNCE_IN_MS = 400;

// Every live page of the workspace (paged in full), shaped as a tree. Writes
// made through Apollo update the list optimistically; pages created outside
// it (template gallery, other tabs) are picked up on side-panel close, window
// focus and record operation events.
//
// Raw query results are never rendered directly: a refetch returns only its
// first page, which would collapse the tree to that page before the paged
// fetches re-fill it on every focus or record event. The reconciled view below
// keeps the previously known tail visible while pages re-arrive, then adopts
// the newly collected full list when a resync cycle finishes, so rows deleted
// elsewhere disappear cleanly and the tree never shrinks and re-grows.
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

  const { reconciledDocuments, ingest } = useBureauRecordsReconciler();

  useEffect(() => {
    if (hasNextPage === true && !loading) {
      void fetchMoreRecords();
    }
  }, [fetchMoreRecords, hasNextPage, loading]);

  // Ingest every watch-query result: initial pages, refetch snapshots, resumed
  // pages and optimistic updates.
  useEffect(() => {
    if (loading) return;
    ingest({ incoming: records, hasNextPage: hasNextPage === true });
  }, [hasNextPage, ingest, loading, records]);

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

  const tree = useMemo(
    () => buildBureauTree(reconciledDocuments),
    [reconciledDocuments],
  );

  return {
    documents: reconciledDocuments,
    tree,
    isLoading: loading || hasNextPage === true,
    error,
    resyncDocuments,
  };
};

// Reconciliation state machine over record results (see useBureauDocuments).
const useBureauRecordsReconciler = (): {
  reconciledDocuments: BureauDocument[];
  ingest: (input: { incoming: BureauDocument[]; hasNextPage: boolean }) => void;
} => {
  // The union currently rendered; map iteration order does not matter because
  // buildBureauTree sorts siblings itself.
  // oxlint-disable-next-line twenty/no-state-useref
  const stableByIdRef = useRef(new Map<string, BureauDocument>());
  // Rows collected from freshly fetched pages during a resync cycle.
  // oxlint-disable-next-line twenty/no-state-useref
  const cycleByIdRef = useRef<Map<string, BureauDocument> | null>(null);
  const [documents, setDocuments] = useState<BureauDocument[]>([]);

  const publish = (sourceById: Map<string, BureauDocument>) => {
    setDocuments([...sourceById.values()]);
  };

  const ingest = (input: {
    incoming: BureauDocument[];
    hasNextPage: boolean;
  }) => {
    const { incoming, hasNextPage } = input;
    const stable = stableByIdRef.current;
    const cycle = cycleByIdRef.current;

    if (isDefined(cycle)) {
      // Mid-resync: keep the tail visible while pages land; the collected
      // pages become the whole truth when the cycle completes.
      for (const record of incoming) cycle.set(record.id, record);
      for (const record of incoming) stable.set(record.id, record);
      publish(stable);
      if (!hasNextPage) {
        cycleByIdRef.current = null;
        stableByIdRef.current = cycle;
        publish(cycle);
      }
      return;
    }

    if (incoming.length >= stable.size) {
      // Full replacement is safe: the server result is at least as large as
      // what we render, so it covers (and supersedes) every known row.
      const fresh = new Map<string, BureauDocument>();
      for (const record of incoming) fresh.set(record.id, record);
      stableByIdRef.current = fresh;
      publish(fresh);
      return;
    }

    if (hasNextPage) {
      // The result is a truncated snapshot of a larger known list (a refetch
      // mid-paging or an optimistic first-page write): enter a resync cycle
      // and keep the tail rendered instead of collapsing the tree.
      cycleByIdRef.current = new Map(
        incoming.map((record) => [record.id, record] as const),
      );
      for (const record of incoming) stable.set(record.id, record);
      publish(stable);
      return;
    }

    // Smaller final result: the workspace lost rows (deleted/permission) and
    // no more pages follow, so the server result is authoritative.
    const fresh = new Map<string, BureauDocument>();
    for (const record of incoming) fresh.set(record.id, record);
    stableByIdRef.current = fresh;
    publish(fresh);
  };

  return { reconciledDocuments: documents, ingest };
};
