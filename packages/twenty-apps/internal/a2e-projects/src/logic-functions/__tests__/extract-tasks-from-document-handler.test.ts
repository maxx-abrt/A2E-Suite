import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractTasksFromDocument } from '../handlers/extract-tasks-from-document-handler.ts';

// The contract with the Core API: the caller-context `document` query returns
// the record or `null` (missing and unauthorized are indistinguishable at this
// boundary). The fake reproduces exactly that frontier; the generated client is
// never instantiated (it throws before generation).

const DOCUMENT_QUERY_KEY = 'document';

const blocknote = (blocks: unknown[]): string => JSON.stringify(blocks);

const buildClient = (document: unknown) => {
  const queries: { args: unknown }[] = [];

  const client = {
    query: async (selection: Record<string, unknown>) => {
      const entry = selection[DOCUMENT_QUERY_KEY] as { __args?: unknown };

      queries.push({ args: entry?.__args });

      return { [DOCUMENT_QUERY_KEY]: document };
    },
  };

  return { client, queries };
};

test('a readable document yields the extracted proposals', async () => {
  const { client, queries } = buildClient({
    id: 'doc-1',
    content: {
      blocknote: blocknote([
        {
          id: 'b1',
          type: 'checkListItem',
          props: { checked: false },
          content: [{ type: 'text', text: 'Préparer le devis' }],
        },
      ]),
    },
  });

  const result = await extractTasksFromDocument(
    { documentId: 'doc-1', projectId: 'project-1' },
    client,
  );

  assert.deepEqual(result, {
    status: 'EXTRACTED',
    documentId: 'doc-1',
    projectId: 'project-1',
    tasks: [{ title: 'Préparer le devis' }],
  });
  assert.deepEqual(queries, [{ args: { id: 'doc-1' } }]);
});

test('the optional target project defaults to null', async () => {
  const { client } = buildClient({ id: 'doc-1', content: null });

  const result = await extractTasksFromDocument(
    { documentId: 'doc-1' },
    client,
  );

  assert.equal(result.status, 'EXTRACTED');
  assert.equal(result.projectId, null);
  assert.deepEqual(result.tasks, []);
});

test('an empty or body-less document is implemented, with an empty list', async () => {
  const { client } = buildClient({ id: 'doc-1', content: { blocknote: '[]' } });

  const result = await extractTasksFromDocument(
    { documentId: 'doc-1' },
    client,
  );

  assert.deepEqual(result, {
    status: 'EXTRACTED',
    documentId: 'doc-1',
    projectId: null,
    tasks: [],
  });
});

test('a missing or unauthorized document is a typed error, not a stub', async () => {
  const { client } = buildClient(null);

  const result = await extractTasksFromDocument(
    { documentId: 'doc-1' },
    client,
  );

  assert.deepEqual(result, {
    status: 'DOCUMENT_NOT_FOUND',
    documentId: 'doc-1',
    projectId: null,
    tasks: [],
  });
});

test('a blank documentId is refused before any read', async () => {
  const { client, queries } = buildClient({ id: 'doc-1' });

  const result = await extractTasksFromDocument({ documentId: '   ' }, client);

  assert.deepEqual(result, {
    status: 'INVALID_INPUT',
    documentId: '',
    projectId: null,
    tasks: [],
  });
  assert.deepEqual(queries, []);
});
