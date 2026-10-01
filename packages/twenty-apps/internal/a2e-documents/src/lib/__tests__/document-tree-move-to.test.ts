import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectDocumentsByIdFromSiblings,
  collectSiblingsByParentId,
  type TreeDocumentNode,
} from '../document-tree.ts';
import { buildKeyboardMovePayload } from '../document-tree-keyboard.ts';
import {
  buildMoveToDocumentPayload,
  collectMoveToCandidates,
  collectMoveToExcludedIds,
  filterMoveToCandidates,
  type MoveToCandidateNode,
} from '../document-tree-move-to.ts';

const tree: MoveToCandidateNode[] = [
  {
    id: 'a1',
    title: 'Alpha',
    children: {
      edges: [
        { node: { id: 'b1', title: 'Bravo' } },
        { node: { id: 'b2', title: 'Bilan' } },
      ],
    },
  },
  { id: 'a2', title: 'Gamma' },
];

test('collectMoveToCandidates flattens the tree depth-first with indentation', () => {
  assert.deepEqual(collectMoveToCandidates(tree), [
    { id: 'a1', title: 'Alpha', depth: 0 },
    { id: 'b1', title: 'Bravo', depth: 1 },
    { id: 'b2', title: 'Bilan', depth: 1 },
    { id: 'a2', title: 'Gamma', depth: 0 },
  ]);
});

test('filterMoveToCandidates matches the query case-insensitively', () => {
  const candidates = collectMoveToCandidates(tree);

  assert.deepEqual(
    filterMoveToCandidates(candidates, {
      query: 'bilan',
      excludedIds: new Set(),
    }).map((candidate) => candidate.id),
    ['b2'],
  );
});

test('filterMoveToCandidates hides the moved document and its subtree', () => {
  const siblingsByParentId = collectSiblingsByParentId(
    tree as TreeDocumentNode[],
  );
  const documentsById = collectDocumentsByIdFromSiblings(siblingsByParentId);
  const excludedIds = collectMoveToExcludedIds({
    documentId: 'a1',
    documentsById,
  });

  assert.deepEqual([...excludedIds].sort(), ['a1', 'b1', 'b2']);
  assert.deepEqual(
    filterMoveToCandidates(collectMoveToCandidates(tree), {
      query: '',
      excludedIds,
    }).map((candidate) => candidate.id),
    ['a2'],
  );
});

test('an empty query keeps every allowed candidate', () => {
  assert.equal(
    filterMoveToCandidates(collectMoveToCandidates(tree), {
      query: '   ',
      excludedIds: new Set(['a2']),
    }).length,
    3,
  );
});

test('buildMoveToDocumentPayload appends under the chosen parent', () => {
  const payload = buildMoveToDocumentPayload({
    documentId: 'a2',
    targetParentId: 'a1',
    targetSiblings: [
      { id: 'b1', position: 'a0' },
      { id: 'b2', position: 'a1' },
    ],
    documentsById: new Map(),
  });

  assert.equal(payload?.parentDocumentId, 'a1');
  assert.ok(payload !== null && payload.position > 'a1');
});

test('buildMoveToDocumentPayload refuses a descendant destination', () => {
  const documentsById = new Map([
    ['a1', { id: 'a1', parentDocumentId: null }],
    ['b1', { id: 'b1', parentDocumentId: 'a1' }],
  ]);

  assert.equal(
    buildMoveToDocumentPayload({
      documentId: 'a1',
      targetParentId: 'b1',
      targetSiblings: [],
      documentsById,
    }),
    null,
  );
});

test('the move-to and keyboard paths agree on the destination parent', () => {
  // C7: the keyboard equivalent must perform the same mutation the drag path
  // performs. Indenting under the previous sibling and moving-to that sibling
  // both resolve to the same target parent id.
  const siblingsByParentId = collectSiblingsByParentId(
    tree as TreeDocumentNode[],
  );
  const keyboardPayload = buildKeyboardMovePayload({
    documentId: 'a2',
    direction: 'indent',
    parentId: null,
    siblingsByParentId,
  });

  const moveToPayload = buildMoveToDocumentPayload({
    documentId: 'a2',
    targetParentId: 'a1',
    targetSiblings: siblingsByParentId.get('a1') ?? [],
    documentsById: collectDocumentsByIdFromSiblings(siblingsByParentId),
  });

  assert.equal(keyboardPayload?.parentDocumentId, 'a1');
  assert.equal(keyboardPayload?.parentDocumentId, moveToPayload?.parentDocumentId);
});
