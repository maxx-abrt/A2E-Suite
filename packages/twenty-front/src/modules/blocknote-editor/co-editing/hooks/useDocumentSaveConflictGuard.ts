import { useCallback, useRef, useState } from 'react';

import { classifyDocumentSaveConflict } from '@/blocknote-editor/co-editing/utils/classifyDocumentSaveConflict';

export type DocumentSaveConflict = {
  conflictingBlockIds: string[];
  remoteBody: string;
};

export type DocumentSaveConflictGuard = {
  conflict: DocumentSaveConflict | null;
  // Seeds the expected revision (the body the local edits start from) and
  // records an adopted remote body as the new base.
  resetBase: (body: string) => void;
  // Records a successful local persist: the server now holds this body.
  notePersisted: (body: string) => void;
  // Drops the pending conflict without changing the base.
  clearConflict: () => void;
  // Called with the latest record body and the local editing body; classifies
  // a concurrent revision and raises a conflict when it overlaps local edits.
  observeRevision: (remoteBody: string, localBody: string) => void;
};

// Client-side expected-revision guard for document saves. v1 has no server
// save/merge protocol, so this compares the latest known record body against
// the body the local edits were based on: an overlapping concurrent revision
// raises a conflict the editor surfaces while keeping the local draft intact,
// and the base only advances on an echo of our own write, an adopted remote
// body, or a disjoint concurrent revision.
export const useDocumentSaveConflictGuard = (
  isEnabled: boolean,
): DocumentSaveConflictGuard => {
  // The expected-revision token is read from a debounced persist callback and
  // never drives rendering, so it stays a mutable ref rather than state; the
  // surfaced conflict is the render state.
  // oxlint-disable-next-line twenty/no-state-useref
  const baseBodyRef = useRef<string | null>(null);
  const [conflict, setConflict] = useState<DocumentSaveConflict | null>(null);

  const resetBase = useCallback((body: string) => {
    baseBodyRef.current = body;
  }, []);

  const notePersisted = useCallback((body: string) => {
    baseBodyRef.current = body;
  }, []);

  const clearConflict = useCallback(() => {
    setConflict(null);
  }, []);

  const observeRevision = useCallback(
    (remoteBody: string, localBody: string) => {
      if (!isEnabled) {
        return;
      }

      const baseBody = baseBodyRef.current;

      // No base yet (or an empty one from an editor that mounted before the
      // record body loaded): adopt the observed body as the expected revision
      // instead of diffing against a value the local edits never saw, which
      // would raise a conflict for edits made while the record was loading.
      if (baseBody === null || baseBody === '') {
        baseBodyRef.current = remoteBody;
        return;
      }

      if (remoteBody === baseBody) {
        return;
      }

      // A body equal to the local draft is our own optimistic write or its
      // echo, not a concurrent revision.
      if (remoteBody === localBody) {
        baseBodyRef.current = remoteBody;
        return;
      }

      const result = classifyDocumentSaveConflict({
        baseBody,
        localBody,
        remoteBody,
      });

      baseBodyRef.current = remoteBody;

      if (result.outcome === 'conflict') {
        setConflict({
          conflictingBlockIds: result.conflictingBlockIds,
          remoteBody,
        });
      }
    },
    [isEnabled],
  );

  return {
    conflict,
    resetBase,
    notePersisted,
    clearConflict,
    observeRevision,
  };
};
