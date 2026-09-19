import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DOCUMENT_PARENT_CYCLE_ERROR_CODE,
  DOCUMENT_PARENT_CYCLE_ERROR_MESSAGE,
  isDocumentParentCycle,
  readDocumentParentChange,
  readDocumentParentId,
  repairDocumentParentCycle,
  resolveDocumentCycleRepairParentId,
  validateDocumentParentMove,
  type DocumentParentLoader,
} from '../document-cycle.ts';

// The loader is a parent table: absent or null means "root".
const buildLoader = (
  parentByDocumentId: Record<string, string | null>,
): DocumentParentLoader => {
  return async (documentId) => parentByDocumentId[documentId] ?? null;
};

test('readDocumentParentId reads a relation object, a join column or a parent id', () => {
  assert.equal(readDocumentParentId({ parent: { id: 'p1' } }), 'p1');
  assert.equal(readDocumentParentId({ parent: null }), null);
  assert.equal(readDocumentParentId({ parentDocumentId: 'p2' }), 'p2');
  assert.equal(readDocumentParentId({ parentId: 'p3' }), 'p3');
  assert.equal(readDocumentParentId({ parentId: '' }), null);
  assert.equal(readDocumentParentId(null), null);
});

test('readDocumentParentChange reads the record and falls back to the relation diff', () => {
  const fromRecord = readDocumentParentChange({
    after: { parentDocumentId: 'p1' },
    before: { parentDocumentId: 'p0' },
  });

  assert.deepEqual(fromRecord, {
    parentDocumentId: 'p1',
    previousParentDocumentId: 'p0',
  });

  // The raw event record can omit the join column entirely; the relation diff
  // is then the only source of the changed ids.
  const fromDiff = readDocumentParentChange({
    diff: { parent: { before: { id: 'p0' }, after: { id: 'p1' } } },
  });

  assert.deepEqual(fromDiff, {
    parentDocumentId: 'p1',
    previousParentDocumentId: 'p0',
  });

  const untouchedRoot = readDocumentParentChange({
    after: {},
    diff: { parent: { after: { id: null } } },
  });

  assert.deepEqual(untouchedRoot, {
    parentDocumentId: null,
    previousParentDocumentId: null,
  });
});

test('a null or empty parent is never a cycle', async () => {
  const loadParentDocumentId = buildLoader({});

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'a',
      parentDocumentId: null,
      loadParentDocumentId,
    }),
    false,
  );
  assert.equal(
    await isDocumentParentCycle({
      documentId: 'a',
      parentDocumentId: '',
      loadParentDocumentId,
    }),
    false,
  );
});

test('a plain parent chain up to a root is not a cycle', async () => {
  const loadParentDocumentId = buildLoader({
    b: 'a',
    a: null,
  });

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'child',
      parentDocumentId: 'b',
      loadParentDocumentId,
    }),
    false,
  );
});

test('a document placed under itself is a cycle', async () => {
  const loadParentDocumentId = buildLoader({ a: null });

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'a',
      parentDocumentId: 'a',
      loadParentDocumentId,
    }),
    true,
  );
});

test('a document placed under one of its descendants is a cycle', async () => {
  const loadParentDocumentId = buildLoader({
    root: null,
    child: 'root',
    grandChild: 'child',
  });

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'root',
      parentDocumentId: 'grandChild',
      loadParentDocumentId,
    }),
    true,
  );
});

test('a pre-existing loop among ancestors is a cycle even without the document', async () => {
  const loadParentDocumentId = buildLoader({
    a: 'b',
    b: 'a',
  });

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'moved',
      parentDocumentId: 'a',
      loadParentDocumentId,
    }),
    true,
  );
});

test('a dangling parent link terminates instead of looping', async () => {
  const loadParentDocumentId = buildLoader({
    a: 'missing',
  });

  assert.equal(
    await isDocumentParentCycle({
      documentId: 'child',
      parentDocumentId: 'a',
      loadParentDocumentId,
    }),
    false,
  );
});

test('repair keeps acyclic moves untouched and writes nothing', async () => {
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const outcome = await repairDocumentParentCycle({
    documentId: 'child',
    parentDocumentId: 'a',
    previousParentDocumentId: null,
    loadParentDocumentId: buildLoader({ a: null }),
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, { action: 'none' });
  assert.equal(writes.length, 0);
});

test('repair restores the previous parent when a move would create a cycle', async () => {
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const outcome = await repairDocumentParentCycle({
    documentId: 'root',
    parentDocumentId: 'grandChild',
    previousParentDocumentId: 'oldParent',
    loadParentDocumentId: buildLoader({
      root: null,
      oldParent: null,
      child: 'root',
      grandChild: 'child',
    }),
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, {
    action: 'repaired',
    parentDocumentId: 'oldParent',
    errorCode: DOCUMENT_PARENT_CYCLE_ERROR_CODE,
    errorMessage: DOCUMENT_PARENT_CYCLE_ERROR_MESSAGE,
  });
  assert.deepEqual(writes, [
    { documentId: 'root', parentDocumentId: 'oldParent' },
  ]);
});

test('repair detaches to the root when the move has no previous parent', async () => {
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const outcome = await repairDocumentParentCycle({
    documentId: 'root',
    parentDocumentId: 'grandChild',
    previousParentDocumentId: null,
    loadParentDocumentId: buildLoader({
      root: null,
      child: 'root',
      grandChild: 'child',
    }),
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, {
    action: 'repaired',
    parentDocumentId: null,
    errorCode: DOCUMENT_PARENT_CYCLE_ERROR_CODE,
    errorMessage: DOCUMENT_PARENT_CYCLE_ERROR_MESSAGE,
  });
  assert.deepEqual(writes, [{ documentId: 'root', parentDocumentId: null }]);
});

test('repair never restores the document itself as its own parent', async () => {
  const loadParentDocumentId = buildLoader({ a: null });

  const repairedParentId = await resolveDocumentCycleRepairParentId({
    documentId: 'a',
    previousParentDocumentId: 'a',
    loadParentDocumentId,
  });

  assert.equal(repairedParentId, null);
});

test('repair detaches when the previous parent is itself part of a cycle', async () => {
  const repairedParentId = await resolveDocumentCycleRepairParentId({
    documentId: 'moved',
    previousParentDocumentId: 'a',
    loadParentDocumentId: buildLoader({ a: 'b', b: 'a' }),
  });

  assert.equal(repairedParentId, null);
});

// Acceptance: a direct A→B→A move is refused fail-closed and the guard never
// persists the cyclic target as the parent.
test('a direct A→B→A move is refused and never persisted', async () => {
  // B is A's child today; moving A under B would close A→B→A.
  const loadParentDocumentId = buildLoader({ a: null, b: 'a' });
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const validation = await validateDocumentParentMove({
    documentId: 'a',
    parentDocumentId: 'b',
    loadParentDocumentId,
  });

  assert.deepEqual(validation, {
    allowed: false,
    errorCode: DOCUMENT_PARENT_CYCLE_ERROR_CODE,
    errorMessage: DOCUMENT_PARENT_CYCLE_ERROR_MESSAGE,
  });

  const outcome = await repairDocumentParentCycle({
    documentId: 'a',
    parentDocumentId: 'b',
    previousParentDocumentId: null,
    loadParentDocumentId,
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.equal(outcome.action, 'repaired');
  assert.deepEqual(writes, [{ documentId: 'a', parentDocumentId: null }]);
  assert.ok(
    writes.every((write) => write.parentDocumentId !== 'b'),
    'the refused cyclic parent must never be written',
  );
});

// Acceptance: a deep A→B→C→A move is refused for the same reason.
test('a deep A→B→C→A move is refused and repaired away from the cycle', async () => {
  // Current chain: C → B → A(root); moving A under C closes A→B→C→A.
  const loadParentDocumentId = buildLoader({ a: null, b: 'a', c: 'b' });
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const validation = await validateDocumentParentMove({
    documentId: 'a',
    parentDocumentId: 'c',
    loadParentDocumentId,
  });

  assert.equal(validation.allowed, false);

  const outcome = await repairDocumentParentCycle({
    documentId: 'a',
    parentDocumentId: 'c',
    previousParentDocumentId: null,
    loadParentDocumentId,
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.equal(outcome.action, 'repaired');
  assert.deepEqual(writes, [{ documentId: 'a', parentDocumentId: null }]);
  assert.ok(writes.every((write) => write.parentDocumentId !== 'c'));
});

// Acceptance: self-parenting is refused too (the shortest cycle of all).
test('a self-parent move is refused and never persisted', async () => {
  const loadParentDocumentId = buildLoader({ a: 'b', b: null });
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const validation = await validateDocumentParentMove({
    documentId: 'a',
    parentDocumentId: 'a',
    loadParentDocumentId,
  });

  assert.equal(validation.allowed, false);

  const outcome = await repairDocumentParentCycle({
    documentId: 'a',
    parentDocumentId: 'a',
    previousParentDocumentId: 'a',
    loadParentDocumentId,
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.equal(outcome.action, 'repaired');
  assert.deepEqual(writes, [{ documentId: 'a', parentDocumentId: null }]);
  assert.ok(writes.every((write) => write.parentDocumentId !== 'a'));
});

// Acceptance: relocating a subtree to an unrelated branch stays allowed and
// the guard writes nothing.
test('a valid deep cross-branch move is allowed and mutates nothing', async () => {
  // root → { e → g, f }; moving g from e to f stays acyclic.
  const loadParentDocumentId = buildLoader({
    root: null,
    e: 'root',
    f: 'root',
    g: 'e',
  });
  const writes: { documentId: string; parentDocumentId: string | null }[] = [];

  const validation = await validateDocumentParentMove({
    documentId: 'g',
    parentDocumentId: 'f',
    loadParentDocumentId,
  });

  assert.deepEqual(validation, { allowed: true });

  const outcome = await repairDocumentParentCycle({
    documentId: 'g',
    parentDocumentId: 'f',
    previousParentDocumentId: 'e',
    loadParentDocumentId,
    updateParentDocumentId: async (options) => {
      writes.push(options);
    },
  });

  assert.deepEqual(outcome, { action: 'none' });
  assert.equal(writes.length, 0);
});
