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
    });
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
