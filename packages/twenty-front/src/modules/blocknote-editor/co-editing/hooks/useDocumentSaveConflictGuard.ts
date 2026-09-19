import { useCallback, useRef, useState } from 'react';

import { classifyDocumentSaveConflict } from '@/blocknote-editor/co-editing/utils/classifyDocumentSaveConflict';

export type DocumentSaveConflict = {
  conflictingBlockIds: string[];
  remoteBody: string;
  // The committed revision token the conflicting body belongs to; the
  // "keep my changes" action uses it as its expected revision so the
  // deliberate overwrite is accepted rather than reverted by the guard.
  remoteRevision: string | null;
};

export type DocumentSaveConflictGuard = {
  conflict: DocumentSaveConflict | null;
  // Seeds the expected revision (the body the local edits start from) and
  // records an adopted remote body as the new base.
  resetBase: (body: string, revision?: string | null) => void;
  // Records a successful local persist: the server now holds this body and
  // revision.
  notePersisted: (body: string, revision?: string | null) => void;
  // The revision token to send as the expected base on the next save.
  getBaseRevision: () => string | null;
  // Drops the pending conflict without changing the base.
  clearConflict: () => void;
  // Called with the latest record body and the local editing body; classifies
  // a concurrent revision and raises a conflict when it overlaps local edits.
  observeRevision: (
    remoteBody: string,
    localBody: string,
    remoteRevision?: string | null,
  ) => void;
};

// Client-side expected-revision guard for document saves. The server-side guard
// repairs a committed write whose expected token is no longer current, so this
// tracks the token alongside the base body: an overlapping concurrent revision
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
  // oxlint-disable-next-line twenty/no-state-useref
  const baseRevisionRef = useRef<string | null>(null);
  const [conflict, setConflict] = useState<DocumentSaveConflict | null>(null);

  const resetBase = useCallback((body: string, revision?: string | null) => {
    baseBodyRef.current = body;
    baseRevisionRef.current = revision ?? null;
  }, []);

  const notePersisted = useCallback(
    (body: string, revision?: string | null) => {
      baseBodyRef.current = body;
      baseRevisionRef.current = revision ?? null;
    },
    [],
  );

  const getBaseRevision = useCallback(() => baseRevisionRef.current, []);

  const clearConflict = useCallback(() => {
    setConflict(null);
  }, []);

  const observeRevision = useCallback(
    (remoteBody: string, localBody: string, remoteRevision?: string | null) => {
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
        baseRevisionRef.current = remoteRevision ?? null;
        return;
      }

      if (remoteBody === baseBody) {
        // Same body: still adopt the token so a token-only change (a repair
        // restore) does not leave the expected revision behind.
        baseRevisionRef.current = remoteRevision ?? null;
        return;
      }

      // A body equal to the local draft is our own optimistic write or its
      // echo, not a concurrent revision.
      if (remoteBody === localBody) {
        baseBodyRef.current = remoteBody;
        baseRevisionRef.current = remoteRevision ?? null;
        return;
      }

      const result = classifyDocumentSaveConflict({
        baseBody,
        localBody,
        remoteBody,
      });

      baseBodyRef.current = remoteBody;
      baseRevisionRef.current = remoteRevision ?? null;

      if (result.outcome === 'conflict') {
        setConflict({
          conflictingBlockIds: result.conflictingBlockIds,
          remoteBody,
          remoteRevision: remoteRevision ?? null,
        });
      }
    },
    [isEnabled],
  );

  return {
    conflict,
    resetBase,
    notePersisted,
    getBaseRevision,
    clearConflict,
    observeRevision,
  };
};
