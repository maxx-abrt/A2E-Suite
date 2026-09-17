import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TASK_HUMAN_ID_REFUSED,
  allocateTaskHumanId,
  assignTaskHumanId,
} from '../handlers/task-human-id-handler.ts';

// The CAS contract with the Core API: `updateProjects` renders the caller
// filter into the UPDATE WHERE and returns only the rows it wrote. The stub
// enforces exactly that boundary — no live server, and the generated client is
// never instantiated (it throws before generation). Reads snapshot the row
// synchronously when called, so Promise.all below reproduces two tasks reading
// the same stale counter before either CAS lands.

type ProjectRow = {
  id: string;
  key: string | null;
  taskCounter: number | null;
};

type CasFilter = { eq: number } | { is: 'NULL' };

type CasArgs = {
  filter: { taskCounter: CasFilter };
  data: { taskCounter: number };
};

type CasCall = {
  filter: 'eq' | 'isNull';
  expected: number;
  sequence: number;
};

const buildClient = (project: ProjectRow) => {
  const casCalls: CasCall[] = [];
  const taskWrites: { id: string; humanId: string }[] = [];

  const client = {
    query: async () => ({
      projects: {
        edges: [
          {
            node: {
              id: project.id,
              key: project.key,
              taskCounter: project.taskCounter,
            },
          },
        ],
      },
    }),
    mutation: async (selection: Record<string, unknown>) => {
      if (selection.updateTask !== undefined) {
        const entry = selection.updateTask as {
          __args: { id: string; data: { humanId: string } };
        };

        taskWrites.push({
          id: entry.__args.id,
          humanId: entry.__args.data.humanId,
        });

        return { updateTask: { id: entry.__args.id } };
      }

      const entry = selection.updateProjects as { __args: CasArgs };
      const counterFilter = entry.__args.filter.taskCounter;
      const isNullAttempt = 'is' in counterFilter;
      const expected = isNullAttempt ? 0 : counterFilter.eq;
      const sequence = entry.__args.data.taskCounter;

      casCalls.push({
        filter: isNullAttempt ? 'isNull' : 'eq',
        expected,
        sequence,
      });

      const matches = isNullAttempt
        ? project.taskCounter === null
        : project.taskCounter === counterFilter.eq;

      if (!matches) {
        return { updateProjects: [] };
      }

      project.taskCounter = sequence;

      return { updateProjects: [{ id: project.id }] };
    },
  };

  return { client, casCalls, taskWrites };
};

test('the winner allocates the next slot once and the CAS pins the expected counter', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 12 };
  const { client, casCalls } = buildClient(project);

  const allocated = await allocateTaskHumanId('p1', client);

  assert.deepEqual(casCalls, [{ filter: 'eq', expected: 12, sequence: 13 }]);
  assert.equal(allocated?.humanId, 'PRJ-13');
  assert.equal(allocated?.sequence, 13);
  assert.equal(project.taskCounter, 13);
});

test('concurrent task creations never share a human id', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 5 };
  const { client, taskWrites } = buildClient(project);

  await Promise.all([
    assignTaskHumanId(
      { id: 't1', humanId: null, project: { id: 'p1' } },
      'task.created',
      client,
    ),
    assignTaskHumanId(
      { id: 't2', humanId: null, project: { id: 'p1' } },
      'task.created',
      client,
    ),
  ]);

  assert.equal(project.taskCounter, 7);

  // The loser re-read the counter and retried instead of reprinting PRJ-6.
  assert.deepEqual(taskWrites.map((write) => write.humanId).sort(), [
    'PRJ-6',
    'PRJ-7',
  ]);
  assert.deepEqual(taskWrites.map((write) => write.id).sort(), ['t1', 't2']);
});

test('a NULL counter falls back to the conditional NULL attempt, first slot', async () => {
  const project: ProjectRow = { id: 'p1', key: 'LIV', taskCounter: null };
  const { client, casCalls } = buildClient(project);

  const allocated = await allocateTaskHumanId('p1', client);

  assert.deepEqual(casCalls, [
    { filter: 'eq', expected: 0, sequence: 1 },
    { filter: 'isNull', expected: 0, sequence: 1 },
  ]);
  assert.equal(allocated?.humanId, 'LIV-1');
  assert.equal(project.taskCounter, 1);
});

test('a zero counter takes the first slot through the eq attempt alone', async () => {
  const project: ProjectRow = { id: 'p1', key: 'NUL', taskCounter: 0 };
  const { client, casCalls } = buildClient(project);

  const allocated = await allocateTaskHumanId('p1', client);

  assert.deepEqual(casCalls, [{ filter: 'eq', expected: 0, sequence: 1 }]);
  assert.equal(allocated?.humanId, 'NUL-1');
  assert.equal(project.taskCounter, 1);
});

test('a project without a key yields no allocation', async () => {
  const project: ProjectRow = { id: 'p1', key: null, taskCounter: 3 };
  const { client, casCalls } = buildClient(project);

  assert.equal(await allocateTaskHumanId('p1', client), undefined);
  assert.deepEqual(casCalls, []);
});

test('giving up after the attempt cap throws instead of guessing', async () => {
  const client = {
    // Never changes: every CAS loses, so contention never ends.
    query: async () => ({
      projects: {
        edges: [{ node: { id: 'p1', key: 'PRJ', taskCounter: 99 } }],
      },
    }),
    mutation: async () => ({ updateProjects: [] }),
  };

  await assert.rejects(
    allocateTaskHumanId('p1', client),
    new RegExp(TASK_HUMAN_ID_REFUSED.slice(0, 24)),
  );
});

// --- Assignment flow (task-human-id logic function) ---

test('a created task with a project is numbered and written back', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 3 };
  const { client, taskWrites } = buildClient(project);

  const result = await assignTaskHumanId(
    { id: 't1', humanId: null, project: { id: 'p1' } },
    'task.created',
    client,
  );

  assert.deepEqual(result, { humanId: 'PRJ-4' });
  assert.deepEqual(taskWrites, [{ id: 't1', humanId: 'PRJ-4' }]);
  assert.equal(project.taskCounter, 4);
});

test('the humanId write re-trigger is idempotent, not a re-allocation', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 3 };
  const { client, casCalls, taskWrites } = buildClient(project);

  const result = await assignTaskHumanId(
    { id: 't1', humanId: 'PRJ-1', project: { id: 'p1' } },
    'task.updated',
    client,
  );

  assert.deepEqual(result, { skipped: 'already-numbered' });
  assert.deepEqual(casCalls, []);
  assert.deepEqual(taskWrites, []);
  assert.equal(project.taskCounter, 3);
});

test('a legacy unnumbered task is numbered on its next update', async () => {
  const project: ProjectRow = { id: 'p1', key: 'EVT', taskCounter: 0 };
  const { client, taskWrites } = buildClient(project);

  const result = await assignTaskHumanId(
    { id: 't9', project: { id: 'p1' } },
    'task.updated',
    client,
  );

  assert.deepEqual(result, { humanId: 'EVT-1' });
  assert.deepEqual(taskWrites, [{ id: 't9', humanId: 'EVT-1' }]);
});

test('a task outside any project is skipped', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 3 };
  const { client, casCalls } = buildClient(project);

  assert.deepEqual(
    await assignTaskHumanId(
      { id: 't1', project: null },
      'task.created',
      client,
    ),
    { skipped: 'no-project' },
  );
  assert.deepEqual(casCalls, []);
});

test('irrelevant events and missing records short-circuit', async () => {
  const project: ProjectRow = { id: 'p1', key: 'PRJ', taskCounter: 3 };
  const { client, casCalls } = buildClient(project);

  assert.deepEqual(
    await assignTaskHumanId(
      { id: 't1', project: { id: 'p1' } },
      'task.deleted',
      client,
    ),
    { skipped: 'not-relevant-event' },
  );
  assert.deepEqual(await assignTaskHumanId(undefined, 'task.created', client), {
    skipped: 'no-record',
  });
  assert.deepEqual(casCalls, []);
});
