import { act, renderHook } from '@testing-library/react';

import { useDocumentSaveConflictGuard } from '@/blocknote-editor/co-editing/hooks/useDocumentSaveConflictGuard';

const paragraph = (blockId: string, text: string) => ({
  id: blockId,
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

const body = (...blocks: ReturnType<typeof paragraph>[]) =>
  JSON.stringify(blocks);

describe('useDocumentSaveConflictGuard', () => {
  it('seeds the base from the first observed revision without conflicting', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
    });

    expect(result.current.conflict).toBeNull();
  });

  it('reports a conflict when a concurrent revision overlaps the local edit', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
    });

    act(() => {
      result.current.observeRevision(
        body(paragraph('a', 'Alpha remote')),
        body(paragraph('a', 'Alpha local')),
      );
    });

    expect(result.current.conflict).toEqual({
      conflictingBlockIds: ['a'],
      remoteBody: body(paragraph('a', 'Alpha remote')),
      remoteRevision: null,
    });
  });

  it('tracks the expected revision token and captures the conflicting one', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody, 'docrev-1');
    });

    expect(result.current.getBaseRevision()).toBe('docrev-1');

    act(() => {
      result.current.observeRevision(
        body(paragraph('a', 'Alpha remote')),
        body(paragraph('a', 'Alpha local')),
        'docrev-2',
      );
    });

    expect(result.current.conflict?.remoteRevision).toBe('docrev-2');
    expect(result.current.getBaseRevision()).toBe('docrev-2');
  });

  it('records the persisted revision so the next save expects it', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const persistedBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.notePersisted(persistedBody, 'docrev-9');
    });

    expect(result.current.getBaseRevision()).toBe('docrev-9');

    act(() => {
      result.current.resetBase(persistedBody, 'docrev-10');
    });

    expect(result.current.getBaseRevision()).toBe('docrev-10');
  });

  it('adopts a token-only change without raising a conflict', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody, 'docrev-1');
      result.current.observeRevision(baseBody, baseBody, 'repair-docrev-1');
    });

    expect(result.current.conflict).toBeNull();
    expect(result.current.getBaseRevision()).toBe('repair-docrev-1');
  });

  it('advances the base without conflicting on a disjoint concurrent revision', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'), paragraph('b', 'Beta'));
    const disjointRemote = body(
      paragraph('a', 'Alpha'),
      paragraph('b', 'Beta remote'),
    );

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
    });

    act(() => {
      result.current.observeRevision(
        disjointRemote,
        body(paragraph('a', 'Alpha local'), paragraph('b', 'Beta')),
      );
    });

    expect(result.current.conflict).toBeNull();

    act(() => {
      result.current.observeRevision(disjointRemote, disjointRemote);
    });

    expect(result.current.conflict).toBeNull();
  });

  it('treats an echo of the local body as our own write, not a conflict', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));
    const localBody = body(paragraph('a', 'Alpha local'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
    });

    act(() => {
      result.current.observeRevision(localBody, localBody);
    });

    expect(result.current.conflict).toBeNull();

    act(() => {
      result.current.notePersisted(localBody);
      result.current.observeRevision(localBody, localBody);
    });

    expect(result.current.conflict).toBeNull();
  });

  it('re-seeds the base through resetBase so a re-read remote body is clean', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const adoptedBody = body(paragraph('a', 'Alpha adopted'));

    act(() => {
      result.current.resetBase(adoptedBody);
      result.current.observeRevision(adoptedBody, adoptedBody);
    });

    expect(result.current.conflict).toBeNull();
  });

  it('clears a raised conflict explicitly', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
      result.current.observeRevision(
        body(paragraph('a', 'Alpha remote')),
        body(paragraph('a', 'Alpha local')),
      );
    });

    expect(result.current.conflict).not.toBeNull();

    act(() => {
      result.current.clearConflict();
    });

    expect(result.current.conflict).toBeNull();
  });

  it('does not conflict for edits made while the record body was loading', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const loadedBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision('', '');
    });

    act(() => {
      result.current.observeRevision(
        loadedBody,
        body(paragraph('a', 'Alpha local')),
      );
    });

    expect(result.current.conflict).toBeNull();
  });

  it('allows a retry after the conflict is resolved in favour of the local draft', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(true));
    const baseBody = body(paragraph('a', 'Alpha'));
    const localBody = body(paragraph('a', 'Alpha local'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody, 'docrev-1');
      result.current.observeRevision(
        body(paragraph('a', 'Alpha remote')),
        localBody,
        'docrev-2',
      );
    });

    expect(result.current.conflict).not.toBeNull();

    // "Keep my changes": the local body is persisted against the conflicting
    // token, then its echo must be clean and the next save must expect the
    // token we just wrote.
    act(() => {
      result.current.notePersisted(localBody, 'docrev-3');
      result.current.clearConflict();
      result.current.observeRevision(localBody, localBody, 'docrev-3');
    });

    expect(result.current.conflict).toBeNull();
    expect(result.current.getBaseRevision()).toBe('docrev-3');
  });

  it('never conflicts when the guard is disabled', () => {
    const { result } = renderHook(() => useDocumentSaveConflictGuard(false));
    const baseBody = body(paragraph('a', 'Alpha'));

    act(() => {
      result.current.observeRevision(baseBody, baseBody);
      result.current.observeRevision(
        body(paragraph('a', 'Alpha remote')),
        body(paragraph('a', 'Alpha local')),
      );
    });

    expect(result.current.conflict).toBeNull();
  });
});
