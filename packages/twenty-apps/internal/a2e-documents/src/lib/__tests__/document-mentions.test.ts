import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildMentionIndexRows,
  buildMentionKey,
  diffMentionIndex,
  extractDocumentMentionTargets,
  listMentionedInDocuments,
  syncDocumentMentions,
  type DocumentMentionsClient,
  type ExistingDocumentMentionRow,
} from '../document-mentions.ts';

type QueryCall = {
  key: string;
  args: unknown;
  selection: Record<string, unknown>;
};

type MutationCall = {
  key: string;
  args: unknown;
};

const MENTION = (props: Record<string, unknown>) => ({
  type: 'mention',
  props,
});

const blocknoteWith = (blocks: unknown[]): string => JSON.stringify(blocks);

const buildClient = (options: {
  existing?: ExistingDocumentMentionRow[];
  mentionedInEdges?: unknown[];
} = {}) => {
  const queries: QueryCall[] = [];
  const mutations: MutationCall[] = [];

  const client = {
    query: (async (selection: Record<string, unknown>) => {
      const key = Object.keys(selection)[0] ?? '';
      const entry = selection[key] as { __args?: unknown } | undefined;

      queries.push({ key, args: entry?.__args, selection });

      if (key === 'documentMentions' && options.mentionedInEdges !== undefined) {
        return {
          documentMentions: {
            edges: options.mentionedInEdges.map((node) => ({ node })),
          },
        };
      }

      return {
        documentMentions: {
          edges: (options.existing ?? []).map((node) => ({ node })),
        },
      };
    }) as DocumentMentionsClient['query'],
    mutation: (async (document: Record<string, unknown>) => {
      const key = Object.keys(document)[0] ?? '';
      const entry = document[key] as { __args?: unknown } | undefined;

      mutations.push({ key, args: entry?.__args });

      return key.startsWith('create') ? { [key]: [{ id: 'created' }] } : {};
    }) as DocumentMentionsClient['mutation'],
  };

  return { client, queries, mutations };
};

test('extraction collects each distinct mention target across nested blocks', () => {
  const body = blocknoteWith([
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Voir ' },
        MENTION({
          recordId: 'task-1',
          objectMetadataId: 'metadata-1',
          objectNameSingular: 'task',
          label: 'Préparer',
          imageUrl: '',
        }),
      ],
    },
    {
      type: 'bulletListItem',
      content: [
        MENTION({
          recordId: 'company-1',
          objectNameSingular: 'company',
          label: 'Acme',
        }),
      ],
      children: [
        {
          type: 'paragraph',
          content: [
            MENTION({
              recordId: 'task-1',
              objectNameSingular: 'task',
              label: 'Préparer (doublon)',
            }),
          ],
        },
      ],
    },
  ]);

  assert.deepEqual(extractDocumentMentionTargets(body), [
    { objectNameSingular: 'task', recordId: 'task-1', label: 'Préparer' },
    { objectNameSingular: 'company', recordId: 'company-1', label: 'Acme' },
  ]);
});

test('extraction skips half-resolved legacy mentions and malformed bodies', () => {
  const legacy = blocknoteWith([
    {
      type: 'paragraph',
      content: [MENTION({ recordId: 'task-1', objectMetadataId: 'metadata-1' })],
    },
  ]);

  assert.deepEqual(extractDocumentMentionTargets(legacy), []);
  assert.deepEqual(extractDocumentMentionTargets('{ not json'), []);
  assert.deepEqual(extractDocumentMentionTargets(null), []);
  assert.deepEqual(extractDocumentMentionTargets('   '), []);
});

test('the index row key is document-scoped and stable', () => {
  const rows = buildMentionIndexRows('document-1', [
    { objectNameSingular: 'task', recordId: 'task-1', label: 'Préparer' },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.mentionKey, 'document-1:task:task-1');
  assert.equal(
    rows[0]?.mentionKey,
    buildMentionKey('document-1', {
      objectNameSingular: 'task',
      recordId: 'task-1',
    }),
  );
  assert.equal(rows[0]?.documentId, 'document-1');
  assert.equal(rows[0]?.targetObjectNameSingular, 'task');
  assert.equal(rows[0]?.targetRecordId, 'task-1');
});

test('a save indexes the mentions present in the stored body', async () => {
  const { client, mutations } = buildClient({ existing: [] });
  const body = blocknoteWith([
    {
      type: 'paragraph',
      content: [
        MENTION({
          recordId: 'task-1',
          objectNameSingular: 'task',
          label: 'Préparer',
        }),
        MENTION({
          recordId: 'company-1',
          objectNameSingular: 'company',
          label: 'Acme',
        }),
      ],
    },
  ]);

  const result = await syncDocumentMentions(client, 'document-1', body);

  assert.deepEqual(result, { created: 2, deleted: 0, updated: 0 });
  assert.deepEqual(
    mutations.map((call) => call.key),
    ['createDocumentMentions'],
  );

  const createArgs = mutations[0]?.args as { data?: unknown[] };
  const data = createArgs.data as {
    mentionKey: string;
    documentId: string;
  }[];

  assert.deepEqual(
    data.map((row) => row.mentionKey),
    ['document-1:task:task-1', 'document-1:company:company-1'],
  );
  assert.ok(data.every((row) => row.documentId === 'document-1'));
});

test('un-mentioning removes the row for the same document on the next save', async () => {
  const { client, mutations } = buildClient({
    existing: [
      {
        id: 'mention-task',
        mentionKey: 'document-1:task:task-1',
        targetLabel: 'Préparer',
      },
      {
        id: 'mention-company',
        mentionKey: 'document-1:company:company-1',
        targetLabel: 'Acme',
      },
    ],
  });
  const body = blocknoteWith([
    {
      type: 'paragraph',
      content: [MENTION({ recordId: 'company-1', objectNameSingular: 'company' })],
    },
  ]);

  const result = await syncDocumentMentions(client, 'document-1', body);

  // The task row survived no version: it is deleted, not left stale.
  assert.deepEqual(result, { created: 0, deleted: 1, updated: 1 });
  assert.deepEqual(
    mutations.map((call) => call.key),
    ['deleteDocumentMention', 'updateDocumentMention'],
  );
  assert.deepEqual(mutations[0]?.args, { id: 'mention-task' });
});

test('re-saving an unchanged body touches the index not at all', async () => {
  const body = blocknoteWith([
    {
      type: 'paragraph',
      content: [MENTION({ recordId: 'task-1', objectNameSingular: 'task' })],
    },
  ]);
  const { client, mutations } = buildClient({
    existing: [
      {
        id: 'mention-task',
        mentionKey: 'document-1:task:task-1',
        targetLabel: null,
      },
    ],
  });

  const result = await syncDocumentMentions(client, 'document-1', body);

  assert.deepEqual(result, { created: 0, deleted: 0, updated: 0 });
  assert.deepEqual(mutations, []);
});

test('a changed label is refreshed in place, keeping the row id', async () => {
  const body = blocknoteWith([
    {
      type: 'paragraph',
      content: [
        MENTION({
          recordId: 'task-1',
          objectNameSingular: 'task',
          label: 'Nouveau titre',
        }),
      ],
    },
  ]);
  const { client, mutations } = buildClient({
    existing: [
      {
        id: 'mention-task',
        mentionKey: 'document-1:task:task-1',
        targetLabel: 'Ancien titre',
      },
    ],
  });

  await syncDocumentMentions(client, 'document-1', body);

  assert.deepEqual(mutations, [
    {
      key: 'updateDocumentMention',
      args: { id: 'mention-task', data: { targetLabel: 'Nouveau titre' } },
    },
  ]);
});

test('the read model returns referencing documents without touching any body', async () => {
  const { client, queries } = buildClient({
    mentionedInEdges: [
      {
        id: 'mention-1',
        document: {
          id: 'document-1',
          title: 'Compte rendu',
          archivedAt: null,
        },
      },
      {
        id: 'mention-2',
        document: {
          id: 'document-2',
          title: 'Journal',
          archivedAt: '2026-09-01T00:00:00.000Z',
        },
      },
    ],
  });

  const documents = await listMentionedInDocuments(client, {
    objectNameSingular: 'task',
    recordId: 'task-1',
  });

  assert.deepEqual(documents, [
    { documentId: 'document-1', title: 'Compte rendu', isArchived: false },
    { documentId: 'document-2', title: 'Journal', isArchived: true },
  ]);

  // No full-text scan: exactly one query, against the index, and its selection
  // never mentions the document body.
  assert.equal(queries.length, 1);
  assert.equal(queries[0]?.key, 'documentMentions');
  assert.ok(!JSON.stringify(queries[0]?.selection).includes('content'));
  assert.deepEqual(queries[0]?.args, {
    filter: {
      targetObjectNameSingular: { eq: 'task' },
      targetRecordId: { eq: 'task-1' },
    },
    first: 200,
  });
});

test('the read model drops documents the viewer cannot read', async () => {
  const { client } = buildClient({
    mentionedInEdges: [
      { id: 'mention-1', document: null },
      { id: 'mention-2', document: { id: null, title: 'Secret' } },
      {
        id: 'mention-3',
        document: { id: 'document-readable', title: 'Visible' },
      },
    ],
  });

  const documents = await listMentionedInDocuments(client, {
    objectNameSingular: 'task',
    recordId: 'task-1',
  });

  assert.deepEqual(documents, [
    { documentId: 'document-readable', title: 'Visible', isArchived: false },
  ]);
});

test('the read model dedupes a document mentioned through several index rows', async () => {
  const { client } = buildClient({
    mentionedInEdges: [
      { id: 'mention-1', document: { id: 'document-1', title: 'Une' } },
      { id: 'mention-2', document: { id: 'document-1', title: 'Une' } },
    ],
  });

  const documents = await listMentionedInDocuments(client, {
    objectNameSingular: 'task',
    recordId: 'task-1',
  });

  assert.equal(documents.length, 1);
});

test('an invalid read target touches no client', async () => {
  const { client, queries } = buildClient();

  assert.deepEqual(
    await listMentionedInDocuments(client, {
      objectNameSingular: '',
      recordId: 'task-1',
    }),
    [],
  );
  assert.deepEqual(
    await listMentionedInDocuments(client, {
      objectNameSingular: 'task',
      recordId: '  ',
    }),
    [],
  );
  assert.deepEqual(queries, []);
});

test('the diff keeps only the delta between stored and desired rows', () => {
  const desired = buildMentionIndexRows('document-1', [
    { objectNameSingular: 'task', recordId: 'task-1', label: 'Tâche' },
    { objectNameSingular: 'person', recordId: 'person-1', label: null },
  ]);
  const existing: ExistingDocumentMentionRow[] = [
    {
      id: 'row-task',
      mentionKey: 'document-1:task:task-1',
      targetLabel: 'Tâche',
    },
    {
      id: 'row-stale',
      mentionKey: 'document-1:company:company-1',
      targetLabel: 'Acme',
    },
  ];

  const diff = diffMentionIndex(existing, desired);

  assert.deepEqual(
    diff.toCreate.map((row) => row.mentionKey),
    ['document-1:person:person-1'],
  );
  assert.deepEqual(
    diff.toDelete.map((row) => row.id),
    ['row-stale'],
  );
  assert.deepEqual(diff.toUpdate, []);
});
