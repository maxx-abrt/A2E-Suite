import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectSiblingsByParentId,
  type TreeDocumentNode,
} from '../document-tree.ts';
import { buildKeyboardMovePayload } from '../document-tree-keyboard.ts';

const tree: TreeDocumentNode[] = [
  { id: 'a1', position: 'a0' },
  { id: 'a2', position: 'a1', children: {
    edges: [
      { node: { id: 'b1', position: 'a1a' } },
      { node: { id: 'b2', position: 'a1b' } },
    ],
  } },
  { id: 'a3', position: 'a2' },
  { id: 'a4', position: 'a3', children: {
    edges: [{ node: { id: 'c1', position: 'a3a' } }],
  } },
];

const siblingsByParentId = collectSiblingsByParentId(tree);

test('collectSiblingsByParentId groups each level under its parent key', () => {
  assert.deepEqual(
    siblingsByParentId.get(null)?.map((document) => document.id),
    ['a1', 'a2', 'a3', 'a4'],
  );
  assert.deepEqual(
    siblingsByParentId.get('a2')?.map((document) => document.id),
    ['b1', 'b2'],
  );
  assert.deepEqual(
    siblingsByParentId.get('a4')?.map((document) => document.id),
    ['c1'],
  );
});

test('moving up reorders before the previous sibling', () => {
  const payload = buildKeyboardMovePayload({
    documentId: 'a2',
    direction: 'up',
    parentId: null,
    siblingsByParentId,
  });

  assert.equal(payload?.parentDocumentId, null);
  assert.ok(payload !== null && payload.position < 'a0');
});

test('moving up at the top of a level is a no-op', () => {
  assert.equal(
    buildKeyboardMovePayload({
      documentId: 'a1',
      direction: 'up',
      parentId: null,
      siblingsByParentId,
    }),
    null,
  );
});

test('moving down reorders after the next sibling', () => {
  const payload = buildKeyboardMovePayload({
    documentId: 'a2',
    direction: 'down',
    parentId: null,
    siblingsByParentId,
  });

  assert.equal(payload?.parentDocumentId, null);
  assert.ok(payload !== null && 'a2' < payload.position && payload.position < 'a3');
});

test('moving down at the bottom of a level is a no-op', () => {
  assert.equal(
    buildKeyboardMovePayload({
      documentId: 'a4',
      direction: 'down',
      parentId: null,
      siblingsByParentId,
    }),
    null,
  );
});

test('indenting adopts the previous sibling as the new parent', () => {
  const payload = buildKeyboardMovePayload({
    documentId: 'a3',
    direction: 'indent',
    parentId: null,
    siblingsByParentId,
  });

  assert.equal(payload?.parentDocumentId, 'a2');
  assert.ok(payload !== null && payload.position > 'a1b');
});

test('indenting the first sibling has no target', () => {
  assert.equal(
    buildKeyboardMovePayload({
      documentId: 'a1',
      direction: 'indent',
      parentId: null,
      siblingsByParentId,
    }),
    null,
  );
});

test('outdenting a child reinserts it after its former parent', () => {
  const payload = buildKeyboardMovePayload({
    documentId: 'b1',
    direction: 'outdent',
    parentId: 'a2',
    siblingsByParentId,
  });

  assert.equal(payload?.parentDocumentId, null);
  assert.ok(payload !== null && 'a1' < payload.position && payload.position < 'a2');
});

test('outdenting the last child lands after the parent level end', () => {
  const payload = buildKeyboardMovePayload({
    documentId: 'c1',
    direction: 'outdent',
    parentId: 'a4',
    siblingsByParentId,
  });

  assert.equal(payload?.parentDocumentId, null);
  assert.ok(payload !== null && payload.position > 'a3');
});

test('outdenting a root is a no-op', () => {
  assert.equal(
    buildKeyboardMovePayload({
      documentId: 'a1',
      direction: 'outdent',
      parentId: null,
      siblingsByParentId,
    }),
    null,
  );
});

test('an unknown document produces no payload', () => {
  assert.equal(
    buildKeyboardMovePayload({
      documentId: 'missing',
      direction: 'up',
      parentId: null,
      siblingsByParentId,
    }),
    null,
  );
});
