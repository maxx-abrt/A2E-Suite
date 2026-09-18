import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isFolderParentCycle,
  readFolderParentChange,
  readFolderParentId,
  repairFolderParentCycle,
  resolveFolderCycleRepairParentId,
  type FolderParentLoader,
} from '../drive-folder-cycle.ts';

// The loader is a parent table: absent or null means "root".
const buildLoader = (
  parentByFolderId: Record<string, string | null>,
): FolderParentLoader => {
  return async (folderId) => parentByFolderId[folderId] ?? null;
};

test('readFolderParentId reads a relation object, a join column or a parent id', () => {
  assert.equal(readFolderParentId({ parent: { id: 'f1' } }), 'f1');
  assert.equal(readFolderParentId({ parent: null }), null);
  assert.equal(readFolderParentId({ parentFolderId: 'f2' }), 'f2');
  assert.equal(readFolderParentId({ parentId: 'f3' }), 'f3');
  assert.equal(readFolderParentId({ parentId: '' }), null);
  assert.equal(readFolderParentId(null), null);
});

test('readFolderParentChange reads the record and falls back to the relation diff', () => {
  const fromRecord = readFolderParentChange({
    after: { parentFolderId: 'f1' },
    before: { parentFolderId: 'f0' },
  });

  assert.deepEqual(fromRecord, {
    parentFolderId: 'f1',
    previousParentFolderId: 'f0',
  });

  // The raw event record can omit the join column entirely; the relation diff
  // is then the only source of the changed ids.
  const fromDiff = readFolderParentChange({
    diff: { parent: { before: { id: 'f0' }, after: { id: 'f1' } } },
  });

  assert.deepEqual(fromDiff, {
    parentFolderId: 'f1',
    previousParentFolderId: 'f0',
  });

  const untouchedRoot = readFolderParentChange({
    after: {},
    diff: { parent: { after: { id: null } } },
  });

  assert.deepEqual(untouchedRoot, {
    parentFolderId: null,
    previousParentFolderId: null,
  });
});

test('a null or empty parent is never a cycle', async () => {
  const loadParentFolderId = buildLoader({});

  assert.equal(
    await isFolderParentCycle({
      folderId: 'a',
      parentFolderId: null,
      loadParentFolderId,
    }),
    false,
  );
  assert.equal(
    await isFolderParentCycle({
      folderId: 'a',
      parentFolderId: '',
      loadParentFolderId,
    }),
    false,
  );
});

test('a plain parent chain up to a root is not a cycle', async () => {
  const loadParentFolderId = buildLoader({
    b: 'a',
    a: null,
  });

  assert.equal(
    await isFolderParentCycle({
      folderId: 'child',
      parentFolderId: 'b',
      loadParentFolderId,
    }),
    false,
  );
});

test('a folder placed under itself is a cycle', async () => {
  const loadParentFolderId = buildLoader({ a: null });

  assert.equal(
    await isFolderParentCycle({
      folderId: 'a',
      parentFolderId: 'a',
      loadParentFolderId,
    }),
    true,
  );
});

test('a folder placed under one of its descendants is a cycle', async () => {
  const loadParentFolderId = buildLoader({
    root: null,
    child: 'root',
    grandChild: 'child',
  });

  assert.equal(
    await isFolderParentCycle({
      folderId: 'root',
      parentFolderId: 'grandChild',
      loadParentFolderId,
    }),
    true,
  );
});

test('a pre-existing loop among ancestors is a cycle even without the folder', async () => {
  const loadParentFolderId = buildLoader({
    a: 'b',
    b: 'a',
  });

  assert.equal(
    await isFolderParentCycle({
      folderId: 'moved',
      parentFolderId: 'a',
      loadParentFolderId,
    }),
    true,
  );
});

test('a dangling parent link terminates instead of looping', async () => {
  const loadParentFolderId = buildLoader({
    a: 'missing',
  });

  assert.equal(
    await isFolderParentCycle({
      folderId: 'child',
      parentFolderId: 'a',
      loadParentFolderId,
    }),
    false,
  );
});

test('repair keeps acyclic moves untouched and writes nothing', async () => {
  const writes: { folderId: string; parentFolderId: string | null }[] = [];

  const outcome = await repairFolderParentCycle({
    folderId: 'child',
    parentFolderId: 'a',
    previousParentFolderId: null,
    loadParentFolderId: buildLoader({ a: null }),
    updateParentFolderId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, { action: 'none' });
  assert.equal(writes.length, 0);
});

test('repair restores the previous parent when a move would create a cycle', async () => {
  const writes: { folderId: string; parentFolderId: string | null }[] = [];

  const outcome = await repairFolderParentCycle({
    folderId: 'root',
    parentFolderId: 'grandChild',
    previousParentFolderId: 'oldParent',
    loadParentFolderId: buildLoader({
      root: null,
      oldParent: null,
      child: 'root',
      grandChild: 'child',
    }),
    updateParentFolderId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, {
    action: 'repaired',
    parentFolderId: 'oldParent',
  });
  assert.deepEqual(writes, [
    { folderId: 'root', parentFolderId: 'oldParent' },
  ]);
});

test('repair detaches to the root when the move has no previous parent', async () => {
  const writes: { folderId: string; parentFolderId: string | null }[] = [];

  const outcome = await repairFolderParentCycle({
    folderId: 'root',
    parentFolderId: 'grandChild',
    previousParentFolderId: null,
    loadParentFolderId: buildLoader({
      root: null,
      child: 'root',
      grandChild: 'child',
    }),
    updateParentFolderId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, { action: 'repaired', parentFolderId: null });
  assert.deepEqual(writes, [{ folderId: 'root', parentFolderId: null }]);
});

test('repair never restores the folder itself as its own parent', async () => {
  const loadParentFolderId = buildLoader({ a: null });

  const repairedParentId = await resolveFolderCycleRepairParentId({
    folderId: 'a',
    previousParentFolderId: 'a',
    loadParentFolderId,
  });

  assert.equal(repairedParentId, null);
});

test('repair detaches when the previous parent is itself part of a cycle', async () => {
  const repairedParentId = await resolveFolderCycleRepairParentId({
    folderId: 'moved',
    previousParentFolderId: 'a',
    loadParentFolderId: buildLoader({ a: 'b', b: 'a' }),
  });

  assert.equal(repairedParentId, null);
});
