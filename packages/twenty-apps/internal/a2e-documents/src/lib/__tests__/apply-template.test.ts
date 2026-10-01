import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyDocumentTemplateByKey,
  applyResolvedDocumentTemplate,
  type ApplyTemplateClient,
} from '../apply-template.ts';
import { buildDocumentTemplateDescriptors } from '../document-template-descriptors.ts';

type CreatedDocument = { id: string; data: Record<string, unknown> };

const buildClient = (): {
  client: ApplyTemplateClient;
  created: CreatedDocument[];
  operationIdById: Map<string, string>;
  mutationNames: string[];
} => {
  const created: CreatedDocument[] = [];
  const operationIdById = new Map<string, string>();
  const mutationNames: string[] = [];

  const client: ApplyTemplateClient = {
    query: (async (document: Record<string, Record<string, unknown>>) => {
      const queryKey = Object.keys(document)[0] ?? '';
      const args = document[queryKey]?.__args as
        | { filter?: { templateApplyOperationId?: { eq?: string } } }
        | undefined;
      const operationId = args?.filter?.templateApplyOperationId?.eq;
      const id =
        operationId === undefined ? undefined : operationIdById.get(operationId);

      return {
        [queryKey]: {
          edges: id === undefined ? [] : [{ node: { id } }],
        },
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

      const id = `document-${created.length + 1}`;
      created.push({ id, data });

      if (typeof data.templateApplyOperationId === 'string') {
        operationIdById.set(data.templateApplyOperationId, id);
      }

      return { [mutationName]: [{ id }] };
    }) as ApplyTemplateClient['mutation'],
  };

  return { client, created, operationIdById, mutationNames };
};

const emptyInstalledApplications = async () => ({
  names: [],
  universalIdentifiers: [],
});

const runApply = (
  client: ApplyTemplateClient,
  request: {
    key: string;
    inputs?: Record<string, unknown> | null;
    operationId?: string | null;
  },
) =>
  applyDocumentTemplateByKey(client, request, {
    getInstalledApplications: emptyInstalledApplications,
  });

test('applying a page descriptor creates one fresh document from the template', async () => {
  const { client, created, mutationNames } = buildClient();

  const result = await runApply(client, { key: 'notes-de-reunion' });

  assert.equal(result.status, 'applied');
  assert.equal(created.length, 1);
  assert.deepEqual(mutationNames, ['createDocuments']);
  assert.equal(created[0]?.data.title, 'Notes de réunion');
  assert.equal(created[0]?.data.kind, 'DOCUMENT');
  assert.ok(
    String((created[0]?.data.content as { markdown?: string }).markdown).includes(
      '# Notes de réunion',
    ),
  );
  assert.ok(!Object.hasOwn(created[0]?.data ?? {}, 'id'));
});

test('two applies create two distinct documents', async () => {
  const { client, created } = buildClient();

  await runApply(client, { key: 'notes-de-reunion' });
  await runApply(client, { key: 'notes-de-reunion' });

  assert.equal(created.length, 2);
  assert.notEqual(created[0]?.id, created[1]?.id);
});

test('an unknown descriptor key is refused with a typed error', async () => {
  const { client, created } = buildClient();

  const result = await runApply(client, { key: 'inexistant' });

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
    ...buildDocumentTemplateDescriptors()[0]!,
    requiredApps: ['a2e-accounting'],
  };

  const result = await applyResolvedDocumentTemplate(
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

  const first = await runApply(client, {
    key: 'notes-de-reunion',
    operationId: 'op-1',
  });
  const second = await runApply(client, {
    key: 'notes-de-reunion',
    operationId: 'op-1',
  });

  assert.equal(created.length, 1);
  assert.equal(first.status, 'applied');
  assert.equal(second.status, 'applied');
  assert.equal(
    first.status === 'applied' ? first.created[0]?.id : null,
    second.status === 'applied' ? second.created[0]?.id : null,
  );
});
