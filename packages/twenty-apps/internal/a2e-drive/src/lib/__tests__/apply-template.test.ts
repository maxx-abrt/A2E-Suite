import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyFolderStructureTemplateByKey,
  applyResolvedFolderStructureTemplate,
  type ApplyTemplateClient,
} from '../apply-template.ts';
import { buildFolderStructureDescriptors } from '../folder-structure-descriptors.ts';
import {
  FOLDER_STRUCTURE_TEMPLATES,
  flattenFolderStructureTemplate,
} from '../folder-structure-templates.ts';

type CreatedFolder = { id: string; data: Record<string, unknown> };

const buildClient = (): {
  client: ApplyTemplateClient;
  created: CreatedFolder[];
  mutationNames: string[];
} => {
  const created: CreatedFolder[] = [];
  const rootByOperationId = new Map<string, string>();
  const mutationNames: string[] = [];

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
          : rootByOperationId.get(operationId);

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
      const data = args?.data?.[0];

      if (data === undefined) {
        return {};
      }

      const id = `folder-${created.length + 1}`;
      created.push({ id, data });

      if (typeof data.templateApplyOperationId === 'string') {
        rootByOperationId.set(data.templateApplyOperationId, id);
      }

      return { [mutationName]: [{ id }] };
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
  applyFolderStructureTemplateByKey(client, request, {
    getInstalledApplications: async () => ({
      names: [],
      universalIdentifiers: [],
    }),
  });

test('applying a folder descriptor creates the full fresh tree, folders only', async () => {
  const { client, created, mutationNames } = buildClient();
  const template = FOLDER_STRUCTURE_TEMPLATES.find(
    (candidate) => candidate.key === 'CLIENT',
  )!;
  const drafts = flattenFolderStructureTemplate(template);

  const result = await runApply(client, { key: 'CLIENT' });

  assert.equal(result.status, 'applied');
  assert.equal(created.length, drafts.length);
  assert.deepEqual(mutationNames, Array(drafts.length).fill('createDriveFolders'));
  assert.equal(created[0]?.data.name, 'Client');
  assert.equal(created[0]?.data.parentId, undefined);
  assert.equal(created[0]?.data.templateKey, 'CLIENT');
  assert.ok(
    created.every(
      (entry) =>
        !Object.hasOwn(entry.data, 'id') &&
        !Object.hasOwn(entry.data, 'attachmentId'),
    ),
  );

  const [firstChildDraft] = drafts.filter(
    (draft) => draft.parentName !== null,
  );
  const childIndex = drafts.indexOf(firstChildDraft!);
  const parentIndex = drafts.findIndex(
    (draft) => draft.name === firstChildDraft!.parentName,
  );

  assert.equal(created[childIndex]?.data.parentId, created[parentIndex]?.id);
});

test('two applies create two distinct trees', async () => {
  const { client, created } = buildClient();

  await runApply(client, { key: 'CLIENT' });
  await runApply(client, { key: 'CLIENT' });

  assert.notEqual(created[0]?.id, created[1]?.id);
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
    ...buildFolderStructureDescriptors()[0]!,
    requiredApps: ['a2e-accounting'],
  };

  const result = await applyResolvedFolderStructureTemplate(
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

test('re-applying the same operation id creates no duplicate tree', async () => {
  const { client, created } = buildClient();
  const drafts = flattenFolderStructureTemplate(
    FOLDER_STRUCTURE_TEMPLATES.find((entry) => entry.key === 'CLIENT')!,
  );

  await runApply(client, { key: 'CLIENT', operationId: 'op-1' });
  await runApply(client, { key: 'CLIENT', operationId: 'op-1' });

  assert.equal(created.length, drafts.length);
});