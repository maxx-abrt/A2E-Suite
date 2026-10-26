import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyProjectTemplateByKey,
  applyResolvedProjectTemplate,
  type ApplyTemplateClient,
} from '../apply-template.ts';
import { buildProjectTemplateDescriptors } from '../project-template-descriptors.ts';
import { STARTER_PROJECT_TEMPLATES } from '../starter-projects.ts';

type CreatedRow = { id: string; data: Record<string, unknown> };

const buildClient = (): {
  client: ApplyTemplateClient;
  created: CreatedRow[];
  mutationNames: string[];
} => {
  const created: CreatedRow[] = [];
  const projectByOperationId = new Map<string, string>();
  const mutationNames: string[] = [];
  let sequence = 0;

  const client: ApplyTemplateClient = {
    query: (async (document: Record<string, Record<string, unknown>>) => {
      const queryKey = Object.keys(document)[0] ?? '';
      const args = document[queryKey]?.__args as
        | { filter?: { templateApplyOperationId?: { eq?: string } } }
        | undefined;
      const operationId = args?.filter?.templateApplyOperationId?.eq;
      const id =
        operationId === undefined
          ? undefined
          : projectByOperationId.get(operationId);

      return {
        [queryKey]: { edges: id === undefined ? [] : [{ node: { id } }] },
      };
    }) as ApplyTemplateClient['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutationName = Object.keys(document)[0] ?? '';
      mutationNames.push(mutationName);

      const args = document[mutationName]?.__args as
        | { data: Record<string, unknown>[] }
        | undefined;
      const rows = (args?.data ?? []).map((data) => {
        sequence += 1;
        const id = `${mutationName}-${sequence}`;
        created.push({ id, data });

        if (typeof data.templateApplyOperationId === 'string') {
          projectByOperationId.set(data.templateApplyOperationId, id);
        }

        return { id };
      });

      return { [mutationName]: rows };
    }) as ApplyTemplateClient['mutation'],
  };

  return { client, created, mutationNames };
};

const runApply = (
  client: ApplyTemplateClient,
  request: {
    key: string;
    inputs?: Record<string, unknown> | null;
    operationId?: string | null;
  },
) =>
  applyProjectTemplateByKey(client, request, {
    getInstalledApplications: async () => ({
      names: [],
      universalIdentifiers: [],
    }),
    now: new Date('2026-01-01T00:00:00.000Z'),
  });

test('applying a project descriptor creates a fresh project with its tasks and milestones', async () => {
  const { client, created } = buildClient();
  const starter = STARTER_PROJECT_TEMPLATES.find(
    (project) => project.key === 'LIV',
  )!;

  const result = await runApply(client, { key: 'LIV' });

  assert.equal(result.status, 'applied');
  assert.equal(
    created.length,
    1 + starter.tasks.length + starter.milestones.length,
  );

  const project = created[0]!;
  assert.equal(project.data.name, 'Livraison de projet');
  assert.ok(!Object.hasOwn(project.data, 'id'));

  const tasks = created.filter(
    (row) => row.data.projectStatus !== undefined,
  );
  assert.equal(tasks.length, starter.tasks.length);
  assert.ok(tasks.every((row) => row.data.projectId === project.id));
});

test('two applies create two distinct projects', async () => {
  const { client, created } = buildClient();

  await runApply(client, { key: 'LIV' });
  await runApply(client, { key: 'LIV' });

  const projectIds = created
    .filter((row) => row.data.name === 'Livraison de projet')
    .map((row) => row.id);

  assert.equal(projectIds.length, 2);
  assert.notEqual(projectIds[0], projectIds[1]);
});

test('an unknown descriptor key is refused with a typed error', async () => {
  const { client, created } = buildClient();

  const result = await runApply(client, { key: 'INCONNU' });

  assert.equal(result.status, 'rejected');
  assert.equal(
    result.status === 'rejected' ? result.errorCode : null,
    'UNKNOWN_TEMPLATE_KEY',
  );
  assert.equal(created.length, 0);
});

test('a missing required app is refused before any write', async () => {
  const { client, created } = buildClient();
  const descriptor = {
    ...buildProjectTemplateDescriptors()[0]!,
    requiredApps: ['a2e-accounting'],
  };

  const result = await applyResolvedProjectTemplate(
    client,
    descriptor,
    { key: descriptor.key },
    { names: [], universalIdentifiers: [] },
  );

  assert.equal(result.status, 'rejected');
  assert.equal(
    result.status === 'rejected' ? result.errorCode : null,
    'MISSING_REQUIRED_APP',
  );
  assert.equal(created.length, 0);
});

test('re-applying the same operation id creates no duplicate', async () => {
  const { client, created } = buildClient();

  await runApply(client, { key: 'LIV', operationId: 'op-1' });
  await runApply(client, { key: 'LIV', operationId: 'op-1' });

  const projectIds = created
    .filter((row) => row.data.name === 'Livraison de projet')
    .map((row) => row.id);

  assert.equal(projectIds.length, 1);
});


test('own-app templates work without application-settings permission', async () => {
  const { client, created } = buildClient();
  const result = await applyProjectTemplateByKey(client, { key: 'SEM' }, {
    getInstalledApplications: async () => { throw new Error('Application settings permission denied'); },
  });
  assert.equal(result.status, 'applied');
  assert.ok(created.length > 0);
});
