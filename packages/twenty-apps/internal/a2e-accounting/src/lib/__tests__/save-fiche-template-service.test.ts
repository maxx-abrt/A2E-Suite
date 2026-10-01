import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  saveFicheAsTemplate,
  type SaveFicheTemplateClient,
} from '../save-fiche-template-service.ts';
import type { SourceFiche } from '../save-fiche-as-template.ts';

type CreatedFiche = Record<string, unknown>;

const buildClient = (
  sourceFiche: SourceFiche | null,
): {
  client: SaveFicheTemplateClient;
  created: CreatedFiche[];
  mutationNames: string[];
} => {
  const created: CreatedFiche[] = [];
  const mutationNames: string[] = [];

  const client: SaveFicheTemplateClient = {
    query: (async () => ({ fiche: sourceFiche })) as SaveFicheTemplateClient['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutationName = Object.keys(document)[0] ?? '';
      mutationNames.push(mutationName);

      const args = document[mutationName]?.__args as
        | { data?: CreatedFiche[] }
        | undefined;
      const data = args?.data?.[0];

      if (data === undefined) {
        return {};
      }

      const id = `fiche-${created.length + 1}`;
      created.push(data);

      return { [mutationName]: [{ id }] };
    }) as SaveFicheTemplateClient['mutation'],
  };

  return { client, created, mutationNames };
};

test('saving a fiche creates a fresh isTemplate row with a prefixed title and cloned data', async () => {
  const { client, created, mutationNames } = buildClient({
    title: 'Budget associatif',
    templateKey: 'BUDGET_EQUILIBRE',
    subtitle: 'Exercice en cours',
    locale: 'fr',
    fiscalYear: '2026',
    data: { signatoryRole: 'Président(e)', rows: [{ id: 'r1', amount: 100 }] },
  });

  const templateId = await saveFicheAsTemplate(client, 'fiche-src');

  assert.equal(templateId, 'fiche-1');
  assert.deepEqual(mutationNames, ['createFiches']);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.title, 'Modèle — Budget associatif');
  assert.equal(created[0]?.templateKey, 'BUDGET_EQUILIBRE');
  assert.equal(created[0]?.isTemplate, true);
  assert.deepEqual(created[0]?.data, {
    signatoryRole: 'Président(e)',
    rows: [{ id: 'r1', amount: 100 }],
  });
  // The live-instance fields never enter a template row.
  assert.ok(!Object.hasOwn(created[0] ?? {}, 'status'));
  assert.ok(!Object.hasOwn(created[0] ?? {}, 'submittedAt'));
  assert.ok(!Object.hasOwn(created[0] ?? {}, 'savedSubvention'));
});

test('editing the source data after saving never mutates the stored template (C1)', async () => {
  const sourceData: Record<string, unknown> = { score: 1 };
  const { client, created } = buildClient({
    title: 'Fiche',
    templateKey: null,
    subtitle: null,
    locale: 'fr',
    fiscalYear: '2026',
    data: sourceData,
  });

  await saveFicheAsTemplate(client, 'fiche-src');

  sourceData.score = 2;

  assert.deepEqual(created[0]?.data, { score: 1 });
});

test('two saves create two distinct template rows', async () => {
  const { client, created } = buildClient({
    title: 'Fiche',
    templateKey: null,
    subtitle: null,
    locale: null,
    fiscalYear: null,
    data: {},
  });

  const firstId = await saveFicheAsTemplate(client, 'fiche-src');
  const secondId = await saveFicheAsTemplate(client, 'fiche-src');

  assert.notEqual(firstId, secondId);
  assert.equal(created.length, 2);
});

test('an unreadable source creates no template', async () => {
  const { client, created } = buildClient(null);

  const templateId = await saveFicheAsTemplate(client, 'missing');

  assert.equal(templateId, null);
  assert.equal(created.length, 0);
});
