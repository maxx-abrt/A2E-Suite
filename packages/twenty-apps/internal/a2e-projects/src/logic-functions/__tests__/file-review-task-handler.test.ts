import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createFileReviewTask } from '../handlers/file-review-task-handler.ts';

// Le handler est exercé contre un stub Core API qui applique le même contrat
// que le vrai client : `query` ne renvoie que les lignes correspondantes et
// `createTasks` ajoute au magasin. Deux passes sur le même document rejouent
// donc un retry réel, ce que la vérification d'idempotence doit survivre.

type TaskRow = { id: string; recipeCorrelationKey?: string };
type CreatedTask = {
  title: string;
  projectId: string;
  recipeCorrelationKey: string;
  position: string;
};

const buildClient = (initialTasks: TaskRow[]) => {
  const tasks = [...initialTasks];
  const created: CreatedTask[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.tasks as {
        __args: { filter: { recipeCorrelationKey: { eq: string } } };
      };
      const match = tasks.find(
        (task) =>
          task.recipeCorrelationKey ===
          entry.__args.filter.recipeCorrelationKey.eq,
      );

      return { tasks: { edges: match ? [{ node: { id: match.id } }] : [] } };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createTasks as { __args: { data: CreatedTask[] } };
      const data = entry.__args.data[0];

      created.push(data);
      tasks.push({
        id: `created-${created.length}`,
        recipeCorrelationKey: data.recipeCorrelationKey,
      });

      return { createTasks: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, tasks, created };
};

test('an upload linked to a project creates one review task', async () => {
  const { client, created } = buildClient([]);

  const result = await createFileReviewTask(
    {
      fileId: 'document-1',
      fileName: 'contrat.pdf',
      projectId: 'project-1',
      workspaceId: 'workspace-1',
    },
    client,
  );

  assert.equal(result.status, 'CREATED');
  assert.equal(result.taskId, 'created-1');
  assert.deepEqual(created, [
    {
      title: 'Relecture – contrat.pdf',
      projectId: 'project-1',
      recipeCorrelationKey: result.correlationKey,
      position: 'last',
    },
  ]);
});

test('replaying the same document creates nothing and reports what it skipped', async () => {
  const { client, tasks } = buildClient([]);

  await createFileReviewTask({ fileId: 'document-1', projectId: 'project-1' }, client);
  const replayed = await createFileReviewTask(
    { fileId: 'document-1', projectId: 'project-1' },
    client,
  );

  assert.equal(replayed.status, 'ALREADY_EXISTS');
  assert.equal(tasks.length, 1);
});

test('a document without a project is skipped, never an orphan task', async () => {
  const { client, created } = buildClient([]);

  const result = await createFileReviewTask(
    { fileId: 'document-1', projectId: null },
    client,
  );

  assert.equal(result.status, 'SKIPPED');
  assert.equal(result.skipReason, 'PROJECT_NOT_LINKED');
  assert.deepEqual(created, []);
});

test('a document without an id is rejected before touching the Core API', async () => {
  const { client, tasks } = buildClient([]);

  const result = await createFileReviewTask(
    { fileId: '', projectId: 'project-1' },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(tasks, []);
});
