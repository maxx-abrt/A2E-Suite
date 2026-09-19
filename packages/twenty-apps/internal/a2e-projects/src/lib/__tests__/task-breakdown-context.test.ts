import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildTaskBreakdownContext,
  countTasksByPipelineStatus,
  type BreakdownTaskRecord,
} from '../task-breakdown-context.ts';

const TASKS: BreakdownTaskRecord[] = [
  { id: 'a', title: 'A', projectStatus: 'TODO' },
  { id: 'b', title: 'B', projectStatus: 'IN_PROGRESS', parentTask: { id: 'a' } },
  { id: 'c', title: 'C', projectStatus: 'DONE', parentTask: { id: 'a' } },
  { id: 'd', title: 'D', projectStatus: 'TODO', parentTask: { id: 'b' } },
];

test('the breakdown nests the project tasks through the parentTask relation', () => {
  const context = buildTaskBreakdownContext({ tasks: TASKS, milestones: [] });

  assert.deepEqual(
    context.roots.map((node) => node.id),
    ['a'],
  );
  assert.deepEqual(
    context.roots[0].children.map((node) => node.id),
    ['b', 'c'],
  );
  assert.deepEqual(
    context.roots[0].children[0].children.map((node) => node.id),
    ['d'],
  );
  assert.deepEqual(context.roots[0].children[1].children, []);
});

test('an orphan whose parent is not loaded surfaces at the root', () => {
  const context = buildTaskBreakdownContext({
    tasks: [
      { id: 'a', projectStatus: 'TODO' },
      { id: 'orphan', projectStatus: 'TODO', parentTaskId: 'missing' },
    ],
    milestones: [],
  });

  assert.deepEqual(
    context.roots.map((node) => node.id),
    ['a', 'orphan'],
  );
});

test('status counts bucket by the pipeline status, unknown values included', () => {
  const counts = countTasksByPipelineStatus([
    { projectStatus: 'TODO' },
    { projectStatus: 'TODO' },
    { projectStatus: 'IN_PROGRESS' },
    { projectStatus: 'DONE' },
    { projectStatus: 'BLOCKED' },
    { projectStatus: null, status: 'DONE' },
    { projectStatus: null, status: null },
  ]);

  assert.deepEqual(counts, {
    TODO: 2,
    IN_PROGRESS: 1,
    DONE: 2,
    UNKNOWN: 2,
  });
});

test('the breakdown reports the task count and status counts', () => {
  const context = buildTaskBreakdownContext({ tasks: TASKS, milestones: [] });

  assert.equal(context.taskCount, 4);
  assert.deepEqual(context.statusCounts, {
    TODO: 2,
    IN_PROGRESS: 1,
    DONE: 1,
    UNKNOWN: 0,
  });
});

test('milestones keep their dates, with missing fields defaulted', () => {
  const context = buildTaskBreakdownContext({
    tasks: [],
    milestones: [
      {
        id: 'm1',
        name: 'Cadrage',
        dueAt: '2026-09-20T00:00:00.000Z',
        doneAt: null,
      },
      { id: 'm2' },
    ],
  });

  assert.deepEqual(context.milestones, [
    {
      id: 'm1',
      name: 'Cadrage',
      dueAt: '2026-09-20T00:00:00.000Z',
      doneAt: null,
    },
    { id: 'm2', name: null, dueAt: null, doneAt: null },
  ]);
});

test('an empty project yields a zeroed, empty context', () => {
  const context = buildTaskBreakdownContext({ tasks: [], milestones: [] });

  assert.deepEqual(context, {
    taskCount: 0,
    statusCounts: { TODO: 0, IN_PROGRESS: 0, DONE: 0, UNKNOWN: 0 },
    roots: [],
    milestones: [],
  });
});
