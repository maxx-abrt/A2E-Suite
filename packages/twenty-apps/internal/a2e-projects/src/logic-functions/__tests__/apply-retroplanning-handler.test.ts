import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyRetroplanning } from '../handlers/apply-retroplanning-handler.ts';

// The handler is the only layer that talks to the Core API; everything
// scheduling-related is pure. The stub below enforces the same contract the
// real client does (`createTasks`/`updateTask`/`deleteTasks`), so a second run
// over the same store replays what a retry would and must not duplicate work.

type StoredTask = {
  id: string;
  title: string;
  dueAt: string;
  projectId: string;
  projectStatus: string;
  retroplanningProvenance: string | null;
  assigneeId?: string;
  parentTask?: { id: string } | null;
};

type CreatePayload = {
  title: string;
  dueAt: string;
  projectId: string;
  projectStatus: string;
  position: string;
  retroplanningProvenance: string;
  assigneeId?: string;
  parentTaskId?: string;
};

const buildStore = () => {
  const tasks: StoredTask[] = [];
  const created: CreatePayload[] = [];
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  const deleted: string[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.tasks as {
        __args: { filter: { projectId: { eq: string } } };
      };
      const projectId = entry.__args.filter.projectId.eq;

      return {
        tasks: {
          edges: tasks
            .filter((task) => task.projectId === projectId)
            .map((task) => ({
              node: {
                id: task.id,
                title: task.title,
                dueAt: task.dueAt,
                projectStatus: task.projectStatus,
                retroplanningProvenance: task.retroplanningProvenance,
                parentTask: task.parentTask ?? null,
              },
            })),
        },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      if (selection.createTasks !== undefined) {
        const entry = selection.createTasks as {
          __args: { data: CreatePayload[] };
        };
        const payload = entry.__args.data[0] as CreatePayload;
        const id = `created-${tasks.length + 1}`;

        created.push(payload);
        tasks.push({
          id,
          title: payload.title,
          dueAt: payload.dueAt,
          projectId: payload.projectId,
          projectStatus: payload.projectStatus,
          retroplanningProvenance: payload.retroplanningProvenance,
          ...(payload.assigneeId === undefined
            ? {}
            : { assigneeId: payload.assigneeId }),
          parentTask:
            payload.parentTaskId === undefined
              ? null
              : { id: payload.parentTaskId },
        });

        return { createTasks: [{ id }] };
      }

      if (selection.updateTask !== undefined) {
        const entry = selection.updateTask as {
          __args: { id: string; data: Record<string, unknown> };
        };
        const task = tasks.find(
          (candidate) => candidate.id === entry.__args.id,
        );

        updates.push({ id: entry.__args.id, data: entry.__args.data });

        if (task !== undefined) {
          Object.assign(task, entry.__args.data);
        }

        return { updateTask: { id: entry.__args.id } };
      }

      const entry = selection.deleteTasks as {
        __args: { filter: { id: { eq: string } } };
      };
      const targetId = entry.__args.filter.id.eq;

      deleted.push(targetId);

      const index = tasks.findIndex((task) => task.id === targetId);

      if (index >= 0) {
        tasks.splice(index, 1);
      }

      return { deleteTasks: [{ id: targetId }] };
    },
  };

  return { client, tasks, created, updates, deleted };
};

const baseInput = () => ({
  projectId: 'project-1',
  recipeKey: 'delivery',
  deadline: { date: '2026-10-01', timezone: 'Europe/Paris' },
  mode: 'APPEND' as const,
  assigneeRoles: {
    lead: 'member-lead',
    team: 'member-team',
    quality: 'member-quality',
  },
});

const now = new Date('2026-09-01T00:00:00.000Z');

test('a first run creates every standard task with project, dates, assignee and provenance', async () => {
  const { client, tasks, created } = buildStore();

  const result = await applyRetroplanning(baseInput(), now, client);

  assert.equal(result.created, 7);
  assert.equal(result.updated, 0);
  assert.equal(result.removed, 0);
  assert.equal(tasks.length, 7);

  const release = tasks.find((task) => task.title === 'Mise en production');

  assert.equal(release?.dueAt, '2026-10-01T16:00:00.000Z');
  assert.equal(release?.projectStatus, 'TODO');
  assert.equal(release?.assigneeId, 'member-lead');
  assert.equal(
    release?.retroplanningProvenance,
    'delivery@v1:release#2026-10-01T16:00:00.000Z',
  );

  // Subtasks are linked to the created parent and written after it.
  const build = created.find(
    (payload) => payload.title === 'Construire les livrables',
  );
  const buildApi = created.find(
    (payload) => payload.title === 'Développer l’API',
  );

  assert.ok(build && buildApi);
  assert.equal(
    buildApi.parentTaskId,
    tasks.find((task) => task.title === 'Construire les livrables')?.id,
  );
  assert.equal(build.parentTaskId, undefined);
});

test('replaying the same deadline creates nothing and protects finished work', async () => {
  const { client, tasks } = buildStore();

  await applyRetroplanning(baseInput(), now, client);
  const replay = await applyRetroplanning(baseInput(), now, client);

  assert.equal(replay.created, 0);
  assert.equal(replay.updated, 0);
  assert.equal(replay.removed, 0);
  assert.equal(tasks.length, 7);
  // The recipe seeds `scope` as DONE: it is protected, never rewritten.
  assert.equal(replay.skippedProtected, 1);
});

test('moving the deadline updates owned tasks and refreshes their provenance', async () => {
  const { client, tasks } = buildStore();

  await applyRetroplanning(baseInput(), now, client);

  const moved = await applyRetroplanning(
    {
      ...baseInput(),
      deadline: { date: '2026-10-08', timezone: 'Europe/Paris' },
    },
    now,
    client,
  );

  assert.equal(moved.created, 0);
  assert.equal(moved.updated, 6);

  const release = tasks.find((task) => task.title === 'Mise en production');

  assert.equal(release?.dueAt, '2026-10-08T16:00:00.000Z');
  assert.equal(
    release?.retroplanningProvenance,
    'delivery@v1:release#2026-10-08T16:00:00.000Z',
  );
});

test('a manual date edit and a completed task are skipped, not overwritten', async () => {
  const { client, tasks } = buildStore();

  await applyRetroplanning(baseInput(), now, client);

  const release = tasks.find((task) => task.title === 'Mise en production');
  const review = tasks.find((task) => task.title === 'Recette interne');

  assert.ok(release && review);

  release.dueAt = '2026-09-25T16:00:00.000Z';
  review.projectStatus = 'DONE';

  const result = await applyRetroplanning(
    {
      ...baseInput(),
      deadline: { date: '2026-10-08', timezone: 'Europe/Paris' },
    },
    now,
    client,
  );

  assert.equal(release.dueAt, '2026-09-25T16:00:00.000Z');
  assert.equal(
    result.changeSet.protected.some(
      (entry) => entry.key === 'release' && entry.reason === 'MANUALLY_EDITED',
    ),
    true,
  );
  assert.equal(
    result.changeSet.protected.some(
      (entry) => entry.key === 'review' && entry.reason === 'COMPLETED',
    ),
    true,
  );
  assert.equal(
    result.changeSet.update.some((update) => update.key === 'release'),
    false,
  );
  assert.equal(
    result.changeSet.update.some((update) => update.key === 'review'),
    false,
  );
});

test('REPLACE withholds removals until the destructive change is confirmed', async () => {
  const { client, tasks } = buildStore();

  await applyRetroplanning(baseInput(), now, client);

  tasks.push({
    id: 'stale-1',
    title: 'Ancienne tâche',
    dueAt: '2026-09-20T16:00:00.000Z',
    projectId: 'project-1',
    projectStatus: 'TODO',
    retroplanningProvenance:
      'delivery@v1:removed-slot#2026-09-20T16:00:00.000Z',
  });

  const unconfirmed = await applyRetroplanning(
    { ...baseInput(), mode: 'REPLACE' },
    now,
    client,
  );

  assert.equal(unconfirmed.removed, 0);
  assert.equal(unconfirmed.changeSet.requiresDestructiveConfirmation, true);
  assert.equal(
    tasks.some((task) => task.id === 'stale-1'),
    true,
  );

  const confirmed = await applyRetroplanning(
    { ...baseInput(), mode: 'REPLACE', confirmedDestructiveChange: true },
    now,
    client,
  );

  assert.equal(confirmed.removed, 1);
  assert.equal(confirmed.changeSet.requiresDestructiveConfirmation, false);
  assert.equal(
    tasks.some((task) => task.id === 'stale-1'),
    false,
  );
});

test('an unknown recipe fails closed before touching the API', async () => {
  const { client, created } = buildStore();

  await assert.rejects(
    applyRetroplanning({ ...baseInput(), recipeKey: 'nope' }, now, client),
    /inconnue/,
  );
  assert.deepEqual(created, []);
});
