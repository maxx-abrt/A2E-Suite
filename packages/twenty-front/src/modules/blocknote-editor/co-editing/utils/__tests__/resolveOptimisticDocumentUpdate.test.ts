import { resolveOptimisticDocumentUpdate } from '@/blocknote-editor/co-editing/utils/resolveOptimisticDocumentUpdate';

describe('resolveOptimisticDocumentUpdate', () => {
  it('accepts a save based on the latest version unchanged', () => {
    expect(
      resolveOptimisticDocumentUpdate({
        baseVersion: 3,
        latestVersion: 3,
        localChangedBlockIds: ['a'],
        remoteChangedBlockIds: ['b'],
      }),
    ).toEqual({ outcome: 'clean', conflictingBlockIds: [] });
  });

  it('merges when a concurrent save touched disjoint blocks', () => {
    expect(
      resolveOptimisticDocumentUpdate({
        baseVersion: 3,
        latestVersion: 4,
        localChangedBlockIds: ['a', 'c'],
        remoteChangedBlockIds: ['b'],
      }),
    ).toEqual({ outcome: 'merged', conflictingBlockIds: [] });
  });

  it('flags a conflict when the same block changed on both sides', () => {
    expect(
      resolveOptimisticDocumentUpdate({
        baseVersion: 3,
        latestVersion: 4,
        localChangedBlockIds: ['a', 'c'],
        remoteChangedBlockIds: ['c', 'd'],
      }),
    ).toEqual({ outcome: 'conflict', conflictingBlockIds: ['c'] });
  });

  it('treats a rebased local version (older base) as a conflict source only via block overlap', () => {
    // A stale local base with zero block overlap still merges: block-level
    // disjointness is the merge criterion, not the version gap alone.
    expect(
      resolveOptimisticDocumentUpdate({
        baseVersion: 1,
        latestVersion: 9,
        localChangedBlockIds: ['x'],
        remoteChangedBlockIds: ['y', 'z'],
      }),
    ).toEqual({ outcome: 'merged', conflictingBlockIds: [] });
  });

  it('conflicts when the local edit set intersects any remote change', () => {
    expect(
      resolveOptimisticDocumentUpdate({
        baseVersion: 5,
        latestVersion: 6,
        localChangedBlockIds: ['b'],
        remoteChangedBlockIds: ['b'],
      }),
    ).toEqual({ outcome: 'conflict', conflictingBlockIds: ['b'] });
  });
});
