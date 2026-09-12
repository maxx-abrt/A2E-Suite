import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildMoveDocumentPayload,
  buildRestoreDocumentPayload,
  isDescendantOf,
} from '../document-tree.ts';

const byId = (documents: { id: string; parentDocumentId?: string | null }[]) =>
  new Map(documents.map((document) => [document.id, document]));

test('moving to the end of a sibling list appends after the last position', () => {
  const payload = buildMoveDocumentPayload({
    documentId: 'd3',
    targetParentId: null,
    targetSiblings: [
      { id: 'd1', position: 'a0' },
      { id: 'd2', position: 'a1' },
    ],
    insertIndex: 2,
    documentsById: byId([]),
  });

  assert.equal(payload.parentDocumentId, null);
  assert.ok(payload.position > 'a1');
});

test('moving between two siblings sorts between their positions', () => {
  const payload = buildMoveDocumentPayload({
    documentId: 'd3',
    targetParentId: 'p1',
    targetSiblings: [
      { id: 'd1', position: 'a0' },
      { id: 'd2', position: 'a1' },
      { id: 'd3', position: 'a2' },
    ],
    insertIndex: 1,
    documentsById: byId([]),
  });

  assert.equal(payload.parentDocumentId, 'p1');
  assert.ok('a0' < payload.position && payload.position < 'a1');
});

test('the moved document is excluded from its own sibling bounds', () => {
  // d3 currently sits between d1 and d2; moving it at the same index must not
  // generate a position between its old neighbours using its own old key.
  const payload = buildMoveDocumentPayload({
    documentId: 'd3',
    targetParentId: null,
    targetSiblings: [
      { id: 'd1', position: 'a0' },
      { id: 'd3', position: 'a0V' },
      { id: 'd2', position: 'a1' },
    ],
    insertIndex: 1,
    documentsById: byId([]),
  });

  assert.ok('a0' < payload.position && payload.position < 'a1');
});

test('moving under a descendant is rejected', () => {
  const tree = byId([
    { id: 'root', parentDocumentId: null },
    { id: 'child', parentDocumentId: 'root' },
    { id: 'grandchild', parentDocumentId: 'child' },
  ]);

  assert.throws(() =>
    buildMoveDocumentPayload({
      documentId: 'root',
      targetParentId: 'grandchild',
      targetSiblings: [],
      insertIndex: 0,
      documentsById: tree,
    }),
  );
});

test('moving under itself is rejected', () => {
  assert.throws(() =>
    buildMoveDocumentPayload({
      documentId: 'root',
      targetParentId: 'root',
      targetSiblings: [],
      insertIndex: 0,
      documentsById: byId([]),
    }),
  );
});

test('isDescendantOf walks the parent chain', () => {
  const tree = byId([
    { id: 'root', parentDocumentId: null },
    { id: 'child', parentDocumentId: 'root' },
  ]);

  assert.equal(isDescendantOf('child', 'root', tree), true);
  assert.equal(isDescendantOf('root', 'child', tree), false);
});

test('restore clears the archive flag via a root-level append payload', () => {
  const payload = buildRestoreDocumentPayload({
    targetParentId: null,
    targetSiblings: [{ id: 'd1', position: 'a0' }],
  });

  assert.equal(payload.parentDocumentId, null);
  assert.ok(payload.position > 'a0');
});
