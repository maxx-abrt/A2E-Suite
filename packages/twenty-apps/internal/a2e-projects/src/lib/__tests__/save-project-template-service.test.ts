import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  saveProjectAsTemplate,
  type SaveProjectTemplateClient,
} from '../save-project-template-service.ts';

type ProjectSourceRow = {
  name: string;
  key?: string | null;
  status?: string | null;
  health?: string | null;
  description?: { markdown?: string | null } | null;
  tasks?: {
    edges?: {
      node: { id: string; title: string; projectStatus?: string | null };
    }[];
  } | null;
};

type MutationRecord = {
  name: string;
  data: Record<string, unknown>[];
};

const buildClient = (
  sourceProject: ProjectSourceRow | null,
): {
  client: SaveProjectTemplateClient;
  mutations: MutationRecord[];
} => {
  const mutations: MutationRecord[] = [];

  const client: SaveProjectTemplateClient = {
    query: (async () => ({ project: sourceProject })) as SaveProjectTemplateClient['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutationName = Object.keys(document)[0] ?? '';
      const args = document[mutationName]?.__args as
        | { data?: Record<string, unknown>[] }
        | undefined;
      const data = args?.data ?? [];

      mutations.push({ name: mutationName, data });

      if (mutationName === 'createProjects') {
        return { createProjects: [{ id: 'project-template-1' }] };
      }

      return {
        createTasks: data.map(
          (_task, index) => ({ id: `task-template-${index + 1}` }),
        ),
      };
    }) as SaveProjectTemplateClient['mutation'],
  };

  return { client, mutations };
};

const SOURCE_PROJECT: ProjectSourceRow = {
  name: 'Lancement produit',
  key: 'LPR',
  status: 'PLANNING',
  health: 'ON_TRACK',
  description: { markdown: 'Brief du projet' },
  tasks: {
    edges: [
      { node: { id: 'source-task-1', title: 'Cadrer', projectStatus: 'TODO' } },
      { node: { id: 'source-task-2', title: 'Livrer', projectStatus: 'DONE' } },
    ],
  },
};

test('saving a project creates an isTemplate project plus its tasks', async () => {
  const { client, mutations } = buildClient(SOURCE_PROJECT);

  const created = await saveProjectAsTemplate(client, 'source-project');

  assert.deepEqual(
    mutations.map((mutation) => mutation.name),
    ['createProjects', 'createTasks'],
  );

  const projectData = mutations[0]?.data[0];
  assert.equal(projectData?.name, 'Modèle — Lancement produit');
  assert.equal(projectData?.key, 'LPR');
  assert.equal(projectData?.isTemplate, true);
  assert.deepEqual(projectData?.description, { markdown: 'Brief du projet' });

  const taskData = mutations[1]?.data ?? [];
  assert.equal(taskData.length, 2);
  assert.equal(taskData[0]?.projectId, 'project-template-1');
  assert.equal(taskData[0]?.title, 'Cadrer');
  assert.equal(taskData[0]?.projectStatus, 'TODO');

  assert.deepEqual(created, {
    projectId: 'project-template-1',
    taskIds: ['task-template-1', 'task-template-2'],
  });
});

test('the template carries no source task id (C1 no aliasing)', async () => {
  const { client, mutations } = buildClient(SOURCE_PROJECT);

  await saveProjectAsTemplate(client, 'source-project');

  const serialized = JSON.stringify(mutations);
  assert.ok(!serialized.includes('source-task-1'));
  assert.ok(!serialized.includes('source-task-2'));
  assert.ok(!serialized.includes('source-project'));
});

test('editing the source after saving never mutates the stored template (C1)', async () => {
  const { client, mutations } = buildClient(SOURCE_PROJECT);

  await saveProjectAsTemplate(client, 'source-project');

  SOURCE_PROJECT.name = 'Renommé';
  if (SOURCE_PROJECT.tasks?.edges !== undefined) {
    SOURCE_PROJECT.tasks.edges[0]!.node.title = 'Modifié';
  }

  assert.equal(mutations[0]?.data[0]?.name, 'Modèle — Lancement produit');
  assert.equal(mutations[1]?.data[0]?.title, 'Cadrer');

  SOURCE_PROJECT.name = 'Lancement produit';
  if (SOURCE_PROJECT.tasks?.edges !== undefined) {
    SOURCE_PROJECT.tasks.edges[0]!.node.title = 'Cadrer';
  }
});

test('a project with no tasks creates only the template project', async () => {
  const { client, mutations } = buildClient({
    ...SOURCE_PROJECT,
    tasks: { edges: [] },
  });

  const created = await saveProjectAsTemplate(client, 'source-project');

  assert.deepEqual(mutations.map((mutation) => mutation.name), [
    'createProjects',
  ]);
  assert.deepEqual(created, { projectId: 'project-template-1', taskIds: [] });
});

test('an unreadable source creates no template', async () => {
  const { client, mutations } = buildClient(null);

  const created = await saveProjectAsTemplate(client, 'missing');

  assert.equal(created, null);
  assert.equal(mutations.length, 0);
});
