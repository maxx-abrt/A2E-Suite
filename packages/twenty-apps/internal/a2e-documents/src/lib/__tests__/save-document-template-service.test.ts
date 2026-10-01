import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  saveDocumentAsTemplate,
  type SaveDocumentTemplateClient,
  type SourceDocumentRecord,
} from '../save-document-template-service.ts';

type CreatedDocument = Record<string, unknown>;

const buildClient = (
  sourceDocument: SourceDocumentRecord | null,
): {
  client: SaveDocumentTemplateClient;
  created: CreatedDocument[];
  mutationNames: string[];
} => {
  const created: CreatedDocument[] = [];
  const mutationNames: string[] = [];

  const client: SaveDocumentTemplateClient = {
    query: (async () => ({ document: sourceDocument })) as SaveDocumentTemplateClient['query'],
    mutation: (async (document: Record<string, Record<string, unknown>>) => {
      const mutationName = Object.keys(document)[0] ?? '';
      mutationNames.push(mutationName);

      const args = document[mutationName]?.__args as
        | { data?: CreatedDocument[] }
        | undefined;
      const data = args?.data?.[0];

      if (data === undefined) {
        return {};
      }

      const id = `document-${created.length + 1}`;
      created.push(data);

      return { [mutationName]: [{ id }] };
    }) as SaveDocumentTemplateClient['mutation'],
  };

  return { client, created, mutationNames };
};

test('saving a document creates a fresh KIND=TEMPLATE row with a prefixed title', async () => {
  const source: SourceDocumentRecord = {
    title: 'Compte rendu',
    content: { blocknote: '[]', markdown: 'corps' },
  };
  const { client, created, mutationNames } = buildClient(source);

  const templateId = await saveDocumentAsTemplate(client, 'document-src');

  assert.equal(templateId, 'document-1');
  assert.deepEqual(mutationNames, ['createDocuments']);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.title, 'Modèle — Compte rendu');
  assert.equal(created[0]?.kind, 'TEMPLATE');
  assert.deepEqual(created[0]?.content, { blocknote: '[]', markdown: 'corps' });
  // A template is a fresh row: the source id never travels into the payload.
  assert.ok(!Object.hasOwn(created[0] ?? {}, 'id'));
});

test('two saves create two distinct template rows', async () => {
  const source: SourceDocumentRecord = { title: 'Note', content: null };
  const { client, created } = buildClient(source);

  const firstId = await saveDocumentAsTemplate(client, 'document-src');
  const secondId = await saveDocumentAsTemplate(client, 'document-src');

  assert.notEqual(firstId, secondId);
  assert.equal(created.length, 2);
});

test('editing the source after saving never mutates the stored template payload (C1)', async () => {
  const source: SourceDocumentRecord = {
    title: 'Journal',
    content: { blocknote: null, markdown: 'version 1' },
  };
  const { client, created } = buildClient(source);

  await saveDocumentAsTemplate(client, 'document-src');

  source.title = 'Journal modifié';
  if (source.content !== null && source.content !== undefined) {
    source.content.markdown = 'version 2';
  }

  assert.equal(created[0]?.title, 'Modèle — Journal');
  assert.deepEqual(created[0]?.content, { blocknote: null, markdown: 'version 1' });
});

test('an unreadable source creates no template', async () => {
  const { client, created } = buildClient(null);

  const templateId = await saveDocumentAsTemplate(client, 'missing');

  assert.equal(templateId, null);
  assert.equal(created.length, 0);
});
