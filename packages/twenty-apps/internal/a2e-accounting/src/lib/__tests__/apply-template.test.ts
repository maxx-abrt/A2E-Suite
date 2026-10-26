import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyFicheTemplateByKey,
  applyResolvedFicheTemplate,
  type ApplyTemplateClient,
} from '../apply-template.ts';
import { buildFicheTemplateDescriptors } from '../fiche-template-descriptors.ts';

type CreatedFiche = { id: string; data: Record<string, unknown> };

const buildClient = (): {
  client: ApplyTemplateClient;
  created: CreatedFiche[];
  mutationNames: string[];
} => {
  const created: CreatedFiche[] = [];
  const ficheByOperationId = new Map<string, string>();
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
          : ficheByOperationId.get(operationId);

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

      const id = `fiche-${created.length + 1}`;
      created.push({ id, data });

      if (typeof data.templateApplyOperationId === 'string') {
        ficheByOperationId.set(data.templateApplyOperationId, id);
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
  applyFicheTemplateByKey(client, request, {
    getInstalledApplications: async () => ({
      names: [],
      universalIdentifiers: [],
    }),
    now: new Date('2026-01-01T00:00:00.000Z'),
  });

test('applying a fiche descriptor creates one fresh fiche with the template payload', async () => {
  const { client, created, mutationNames } = buildClient();

  const result = await runApply(client, { key: 'ASSO_FR' });

  assert.equal(result.status, 'applied');
  assert.equal(created.length, 1);
  assert.deepEqual(mutationNames, ['createFiches']);
  assert.equal(created[0]?.data.title, 'Fiche projet associatif');
  assert.equal(created[0]?.data.templateKey, 'ASSO_FR');
  assert.equal(created[0]?.data.fiscalYear, '2026');
  assert.equal(
    (created[0]?.data.data as Record<string, unknown>).signatoryRole,
    'Président(e)',
  );
  assert.equal(
    (created[0]?.data.data as Record<string, unknown>).isTemplate,
    undefined,
  );
  assert.ok(!Object.hasOwn(created[0]?.data ?? {}, 'id'));
});

test('two applies create two distinct fiches', async () => {
  const { client, created } = buildClient();

  await runApply(client, { key: 'ASSO_FR' });
  await runApply(client, { key: 'ASSO_FR' });

  assert.equal(created.length, 2);
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
    ...buildFicheTemplateDescriptors()[0]!,
    requiredApps: ['a2e-documents'],
  };

  const result = await applyResolvedFicheTemplate(
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

  await runApply(client, { key: 'ASSO_FR', operationId: 'op-1' });
  await runApply(client, { key: 'ASSO_FR', operationId: 'op-1' });

  assert.equal(created.length, 1);
});

test('own-app templates work without application-settings permission', async () => {
  const { client, created } = buildClient();
  const result = await applyFicheTemplateByKey(client, { key: 'BUDGET_MENSUEL_PERSONNEL' }, {
    getInstalledApplications: async () => { throw new Error('Application settings permission denied'); },
  });
  assert.equal(result.status, 'applied');
  assert.ok(created.length > 0);
});
