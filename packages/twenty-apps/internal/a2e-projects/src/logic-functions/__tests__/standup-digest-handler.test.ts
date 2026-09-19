import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildStandupDigestForAssistant } from '../handlers/standup-digest-handler.ts';
import {
  buildFakeCoreClient,
  buildProjectTask,
  buildTasksResponse,
  findQuery,
} from './projects-tool-test-fixtures.ts';

const NOW = new Date('2026-09-19T12:00:00.000Z');
const SINCE_ISO = '2026-09-18T00:00:00.000Z';

test('a project digest reads that project and classifies its tasks', async () => {
  const { client, calls } = buildFakeCoreClient({
    tasks: buildTasksResponse([
      buildProjectTask({
        id: 'done',
        projectStatus: 'DONE',
        updatedAt: '2026-09-19T09:00:00.000Z',
      }),
      buildProjectTask({
        id: 'overdue',
        projectStatus: 'TODO',
        dueAt: '2026-09-19T08:00:00.000Z',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      }),
    ]),
  });

  const result = await buildStandupDigestForAssistant(
    { sinceIso: SINCE_ISO, projectId: 'project-1' },
    client,
    NOW,
  );

  assert.equal(result.status, 'OK');
  assert.equal(result.projectId, 'project-1');
  assert.deepEqual(
    result.digest?.completed.map((task) => task.id),
    ['done'],
  );
  assert.deepEqual(
    result.digest?.overdue.map((task) => task.id),
    ['overdue'],
  );

  const tasksQuery = findQuery(calls, 'tasks');

  assert.deepEqual(
    (tasksQuery?.args as { filter?: unknown } | undefined)?.filter,
    { project: { id: { eq: 'project-1' } } },
  );
});

test('with no projectId the digest scans the whole caller scope', async () => {
  const { client, calls } = buildFakeCoreClient({
    tasks: buildTasksResponse([buildProjectTask({ id: 'workspace-task' })]),
  });

  const result = await buildStandupDigestForAssistant(
    { sinceIso: SINCE_ISO },
    client,
    NOW,
  );

  assert.equal(result.status, 'OK');
  assert.equal(result.projectId, null);

  const tasksQuery = findQuery(calls, 'tasks');

  assert.equal(
    (tasksQuery?.args as { filter?: unknown } | undefined)?.filter,
    undefined,
  );
});

test('the window defaults to the previous local day when sinceIso is absent', async () => {
  const { client } = buildFakeCoreClient({ tasks: buildTasksResponse([]) });

  const result = await buildStandupDigestForAssistant({}, client, NOW);
  const expected = new Date(NOW);

  expected.setDate(expected.getDate() - 1);
  expected.setHours(0, 0, 0, 0);

  assert.equal(result.status, 'OK');
  assert.equal(
    new Date(result.digest?.sinceIso ?? '').getTime(),
    expected.getTime(),
  );
});

test('a blank projectId is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await buildStandupDigestForAssistant(
    { projectId: '   ' },
    client,
  );

  assert.deepEqual(result, {
    status: 'INVALID_INPUT',
    projectId: null,
    digest: null,
  });
  assert.deepEqual(calls, []);
});

test('an unparseable sinceIso is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await buildStandupDigestForAssistant(
    { sinceIso: 'yesterday-ish' },
    client,
  );

  assert.deepEqual(result, {
    status: 'INVALID_INPUT',
    projectId: null,
    digest: null,
  });
  assert.deepEqual(calls, []);
});
