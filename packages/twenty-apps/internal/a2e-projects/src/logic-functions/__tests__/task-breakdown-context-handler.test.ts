import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildTaskBreakdownContextForAssistant } from '../handlers/task-breakdown-context-handler.ts';
import {
  buildFakeCoreClient,
  buildMilestone,
  buildMilestonesResponse,
  buildProjectTask,
  buildTasksResponse,
  findQuery,
} from './projects-tool-test-fixtures.ts';

test('the breakdown reads the project tasks and milestones and assembles the context', async () => {
  const { client, calls } = buildFakeCoreClient({
    tasks: buildTasksResponse([
      buildProjectTask({ id: 'root', projectStatus: 'TODO' }),
      buildProjectTask({
        id: 'child',
        projectStatus: 'DONE',
        parentTask: { id: 'root' },
      }),
    ]),
    milestones: buildMilestonesResponse([
      buildMilestone({ id: 'm1', name: 'Cadrage' }),
    ]),
  });

  const result = await buildTaskBreakdownContextForAssistant(
    { projectId: 'project-1' },
    client,
  );

  assert.equal(result.status, 'OK');
  assert.equal(result.projectId, 'project-1');
  assert.equal(result.context?.taskCount, 2);
  assert.deepEqual(result.context?.statusCounts, {
    TODO: 1,
    IN_PROGRESS: 0,
    DONE: 1,
    UNKNOWN: 0,
  });
  assert.deepEqual(
    result.context?.roots.map((node) => node.id),
    ['root'],
  );
  assert.deepEqual(
    result.context?.roots[0].children.map((node) => node.id),
    ['child'],
  );
  assert.deepEqual(result.context?.milestones, [
    {
      id: 'm1',
      name: 'Cadrage',
      dueAt: '2026-09-20T00:00:00.000Z',
      doneAt: null,
    },
  ]);

  assert.deepEqual(
    (findQuery(calls, 'tasks')?.args as { filter?: unknown } | undefined)
      ?.filter,
    { project: { id: { eq: 'project-1' } } },
  );
  assert.deepEqual(
    (findQuery(calls, 'milestones')?.args as { filter?: unknown } | undefined)
      ?.filter,
    { project: { id: { eq: 'project-1' } } },
  );
});

test('an empty project yields a zeroed context, not an error', async () => {
  const { client } = buildFakeCoreClient({
    tasks: buildTasksResponse([]),
    milestones: buildMilestonesResponse([]),
  });

  const result = await buildTaskBreakdownContextForAssistant(
    { projectId: 'project-1' },
    client,
  );

  assert.equal(result.status, 'OK');
  assert.deepEqual(result.context, {
    taskCount: 0,
    statusCounts: { TODO: 0, IN_PROGRESS: 0, DONE: 0, UNKNOWN: 0 },
    roots: [],
    milestones: [],
  });
});

test('a missing or blank projectId is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const missing = await buildTaskBreakdownContextForAssistant({}, client);
  const blank = await buildTaskBreakdownContextForAssistant(
    { projectId: '   ' },
    client,
  );

  assert.deepEqual(missing, {
    status: 'INVALID_INPUT',
    projectId: null,
    context: null,
  });
  assert.deepEqual(blank, {
    status: 'INVALID_INPUT',
    projectId: null,
    context: null,
  });
  assert.deepEqual(calls, []);
});
