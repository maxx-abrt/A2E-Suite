import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isDocumentParentCycle,
  readDocumentParentChange,
  readDocumentParentId,
  repairDocumentParentCycle,
  resolveDocumentCycleRepairParentId,
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

  assert.deepEqual(outcome, { action: 'repaired', parentDocumentId: 'oldParent' });
  assert.deepEqual(writes, [{ documentId: 'root', parentDocumentId: 'oldParent' }]);
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

  assert.deepEqual(outcome, { action: 'repaired', parentDocumentId: null });
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
