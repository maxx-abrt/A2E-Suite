import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTaskParentPayload,
  collectTaskParentCandidates,
  collectTaskParentIdMap,
  flattenTaskTree,
  isTaskParentCycle,
  nestTaskTree,
  readTaskParentId,
} from '../task-tree.ts';

test('the parent id is read from the relation, the foreign key or the join column', () => {
  assert.equal(readTaskParentId({ parentTask: { id: 't1' } }), 't1');
  assert.equal(readTaskParentId({ parentTaskId: 't2' }), 't2');
  assert.equal(readTaskParentId({ subtaskId: 't3' }), 't3');
  assert.equal(
    readTaskParentId({ parentTask: null, parentTaskId: null }),
    null,
  );
  assert.equal(readTaskParentId({ parentTaskId: '' }), null);
  assert.equal(readTaskParentId({ subtaskId: '' }), null);
  assert.equal(readTaskParentId(null), null);
  assert.equal(readTaskParentId(undefined), null);
});

test('a task nests under its loaded parent and keeps the input order', () => {
  const roots = nestTaskTree([
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B', parentTaskId: 'a' },
    { id: 'c', title: 'C', parentTaskId: 'a' },
    { id: 'd', title: 'D', parentTaskId: 'b' },
  ]);

  assert.deepEqual(
    roots.map((node) => node.id),
    ['a'],
  );
  assert.deepEqual(
    roots[0].children.map((node) => node.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    roots[0].children[0].children.map((node) => node.id),
    ['d'],
  );
  assert.deepEqual(roots[0].children[1].children, []);
});

test('a task whose parent is not loaded surfaces at the root', () => {
  const roots = nestTaskTree([
    { id: 'a', title: 'A' },
    { id: 'orphan', title: 'Orphan', parentTaskId: 'missing' },
  ]);

  assert.deepEqual(
    roots.map((node) => node.id),
    ['a', 'orphan'],
  );
});

test('a corrupt parent cycle is broken into roots instead of recursing forever', () => {
  const roots = nestTaskTree([
    { id: 'a', title: 'A', parentTaskId: 'b' },
    { id: 'b', title: 'B', parentTaskId: 'a' },
    { id: 'c', title: 'C', parentTaskId: 'a' },
  ]);

  const flattenedIds = flattenTaskTree(roots).map((node) => node.id);

  // Every row stays reachable and renders exactly once: the loop is severed,
  // and C remains attached under A.
  assert.equal(flattenedIds.length, new Set(flattenedIds).size);
  assert.ok(flattenedIds.includes('a'));
  assert.ok(flattenedIds.includes('b'));
  assert.ok(flattenedIds.includes('c'));
});

test('flatten walks the forest depth-first, parent before children', () => {
  const roots = nestTaskTree([
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B', parentTaskId: 'a' },
    { id: 'c', title: 'C', parentTaskId: 'b' },
    { id: 'd', title: 'D' },
  ]);

  assert.deepEqual(
    flattenTaskTree(roots).map((node) => node.id),
    ['a', 'b', 'c', 'd'],
  );
});

const parentIdByTaskId = collectTaskParentIdMap([
  { id: 'a' },
  { id: 'b', parentTaskId: 'a' },
  { id: 'c', parentTaskId: 'b' },
  { id: 'd' },
]);

test('no parent and an unknown parent are never a cycle', () => {
  assert.equal(
    isTaskParentCycle({
      taskId: 'a',
      candidateParentId: null,
      parentIdByTaskId,
    }),
    false,
  );
  assert.equal(
    isTaskParentCycle({ taskId: 'a', candidateParentId: '', parentIdByTaskId }),
    false,
  );
  assert.equal(
    isTaskParentCycle({
      taskId: 'a',
      candidateParentId: 'missing',
      parentIdByTaskId,
    }),
    false,
  );
});

test('a task placed under itself or one of its descendants is a cycle', () => {
  assert.equal(
    isTaskParentCycle({
      taskId: 'a',
      candidateParentId: 'a',
      parentIdByTaskId,
    }),
    true,
  );
  assert.equal(
    isTaskParentCycle({
      taskId: 'a',
      candidateParentId: 'c',
      parentIdByTaskId,
    }),
    true,
  );
});

test('an unrelated branch and a legal reparent are not cycles', () => {
  assert.equal(
    isTaskParentCycle({
      taskId: 'a',
      candidateParentId: 'd',
      parentIdByTaskId,
    }),
    false,
  );
  assert.equal(
    isTaskParentCycle({
      taskId: 'c',
      candidateParentId: 'd',
      parentIdByTaskId,
    }),
    false,
  );
});

test('an already-looping ancestry is a cycle even when the task is outside it', () => {
  const loopingMap = collectTaskParentIdMap([
    { id: 'x', parentTaskId: 'y' },
    { id: 'y', parentTaskId: 'x' },
  ]);

  assert.equal(
    isTaskParentCycle({
      taskId: 'task',
      candidateParentId: 'x',
      parentIdByTaskId: loopingMap,
    }),
    true,
  );
});

test('the payload builder refuses a cyclic parent and clears it with null', () => {
  assert.deepEqual(
    buildTaskParentPayload({
      taskId: 'c',
      candidateParentId: 'd',
      parentIdByTaskId,
    }),
    { parentTaskId: 'd' },
  );
  assert.deepEqual(
    buildTaskParentPayload({
      taskId: 'c',
      candidateParentId: null,
      parentIdByTaskId,
    }),
    { parentTaskId: null },
  );
  assert.throws(() =>
    buildTaskParentPayload({
      taskId: 'a',
      candidateParentId: 'c',
      parentIdByTaskId,
    }),
  );
  assert.throws(() =>
    buildTaskParentPayload({
      taskId: 'a',
      candidateParentId: 'a',
      parentIdByTaskId,
    }),
  );
});

test('the picker excludes the task and its descendants, keeps legal parents', () => {
  const candidateIds = collectTaskParentCandidates({
    taskId: 'a',
    tasks: [
      { id: 'a' },
      { id: 'b', parentTaskId: 'a' },
      { id: 'c', parentTaskId: 'b' },
      { id: 'd' },
    ],
    parentIdByTaskId,
  }).map((task) => task.id);

  assert.deepEqual(candidateIds, ['d']);
});
