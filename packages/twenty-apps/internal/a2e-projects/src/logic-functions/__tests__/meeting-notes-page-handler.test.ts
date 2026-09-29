import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMeetingNotesPage } from '../handlers/meeting-notes-page-handler.ts';

// Le handler est exercé contre un stub Core API qui applique le même contrat
// que le vrai client : `query` ne renvoie que les lignes correspondantes et
// `createDocuments` ajoute au magasin. Deux passes sur le même événement
// rejouent donc un retry réel, ce que la vérification d'idempotence doit
// survivre.

type DocumentRow = { id: string; recipeCorrelationKey?: string };
type CreatedDocument = {
  title: string;
  kind: string;
  recipeCorrelationKey: string;
  tags: string[];
  position: string;
};

const buildClient = (initialDocuments: DocumentRow[]) => {
  const documents = [...initialDocuments];
  const created: CreatedDocument[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection.documents as {
        __args: { filter: { recipeCorrelationKey: { eq: string } } };
      };
      const match = documents.find(
        (document) =>
          document.recipeCorrelationKey ===
          entry.__args.filter.recipeCorrelationKey.eq,
      );

      return {
        documents: { edges: match ? [{ node: { id: match.id } }] : [] },
      };
    },
    mutation: async (selection: Record<string, unknown>) => {
      const entry = selection.createDocuments as {
        __args: { data: CreatedDocument[] };
      };
      const data = entry.__args.data[0];

      created.push(data);
      documents.push({
        id: `created-${created.length}`,
        recipeCorrelationKey: data.recipeCorrelationKey,
      });

      return { createDocuments: [{ id: `created-${created.length}` }] };
    },
  };

  return { client, documents, created };
};

test('a meeting creates one Bureau notes page carrying its provenance', async () => {
  const { client, created } = buildClient([]);

  const result = await createMeetingNotesPage(
    { eventId: 'event-1', eventTitle: 'Point hebdo', workspaceId: 'workspace-1' },
    client,
  );

  assert.equal(result.status, 'CREATED');
  assert.equal(result.documentId, 'created-1');
  assert.ok(result.correlationKey?.includes('meeting-notes@v1'));
  assert.deepEqual(created, [
    {
      title: 'Notes de réunion – Point hebdo',
      kind: 'DOCUMENT',
      recipeCorrelationKey: result.correlationKey,
      tags: ['MEETING_NOTES'],
      position: 'V',
    },
  ]);
});

test('replaying the same meeting creates nothing and reports what it skipped', async () => {
  const { client, documents } = buildClient([]);

  await createMeetingNotesPage({ eventId: 'event-1' }, client);
  const replayed = await createMeetingNotesPage({ eventId: 'event-1' }, client);

  assert.equal(replayed.status, 'ALREADY_EXISTS');
  assert.equal(replayed.documentId, 'created-1');
  assert.equal(documents.length, 1);
});

test('an event without an id is rejected before touching the Core API', async () => {
  const { client, documents, created } = buildClient([]);

  const result = await createMeetingNotesPage({ eventId: '  ' }, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.equal(result.documentId, null);
  assert.deepEqual(created, []);
  assert.deepEqual(documents, []);
});
