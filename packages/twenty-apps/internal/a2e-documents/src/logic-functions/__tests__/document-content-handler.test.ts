import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readDocumentContent } from '../handlers/document-content-handler.ts';
import {
  buildDocument,
  buildFakeCoreClient,
  findQuery,
} from './document-tool-test-fixtures.ts';

// Contract with the Core API: the caller-context `document` query returns the
// document or `null`. Missing and unauthorized are the same `null` at this
// boundary, so both fail closed to one typed status and never leak content.

test('a readable document yields its blocknote body and metadata', async () => {
  const { client, calls } = buildFakeCoreClient({
    document: buildDocument({ content: { blocknote: '[{"type":"paragraph"}]' } }),
  });

  const result = await readDocumentContent({ documentId: 'document-1' }, client);

  assert.deepEqual(result, {
    status: 'READ',
    documentId: 'document-1',
    includeMetadata: true,
    blocknote: '[{"type":"paragraph"}]',
    metadata: {
      id: 'document-1',
      title: 'Note de réunion',
      kind: 'DOCUMENT',
      updatedAt: '2026-09-19T09:00:00.000Z',
    },
  });
  // The read asks for exactly the fields the tool exposes, caller-scoped by id.
  assert.deepEqual(findQuery(calls, 'document')?.args, { id: 'document-1' });
  assert.equal(calls.length, 1);
});

test('the document id is trimmed before the read', async () => {
  const { client, calls } = buildFakeCoreClient({
    document: buildDocument(),
  });

  const result = await readDocumentContent(
    { documentId: '  document-1  ' },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.documentId, 'document-1');
  assert.deepEqual(findQuery(calls, 'document')?.args, { id: 'document-1' });
});

test('a template exposes kind TEMPLATE', async () => {
  const { client } = buildFakeCoreClient({
    document: buildDocument({ kind: 'TEMPLATE' }),
  });

  const result = await readDocumentContent({ documentId: 'document-1' }, client);

  assert.equal(result.status, 'READ');
  assert.equal(result.metadata?.kind, 'TEMPLATE');
});

test('an unexpected kind fails closed to DOCUMENT', async () => {
  const { client } = buildFakeCoreClient({
    document: buildDocument({ kind: 'SOMETHING_ELSE' }),
  });

  const result = await readDocumentContent({ documentId: 'document-1' }, client);

  assert.equal(result.metadata?.kind, 'DOCUMENT');
});

test('includeMetadata false omits the metadata block but keeps the body', async () => {
  const { client } = buildFakeCoreClient({
    document: buildDocument(),
  });

  const result = await readDocumentContent(
    { documentId: 'document-1', includeMetadata: false },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.includeMetadata, false);
  assert.equal(result.blocknote, '[]');
  assert.equal(result.metadata, null);
});

test('a document with no body is still readable', async () => {
  const { client } = buildFakeCoreClient({
    document: buildDocument({ title: null, content: null }),
  });

  const result = await readDocumentContent({ documentId: 'document-1' }, client);

  assert.equal(result.status, 'READ');
  assert.equal(result.blocknote, null);
  assert.equal(result.metadata?.title, '');
  assert.equal(result.metadata?.updatedAt, '2026-09-19T09:00:00.000Z');
});

test('a missing or unauthorized document fails closed', async () => {
  const { client } = buildFakeCoreClient({ document: null });

  const result = await readDocumentContent({ documentId: 'document-1' }, client);

  assert.deepEqual(result, {
    status: 'DOCUMENT_NOT_FOUND',
    documentId: 'document-1',
    includeMetadata: true,
    blocknote: null,
    metadata: null,
  });
});

test('neither missing nor unauthorized ever exposes another tenant content', async () => {
  // The fake client would only yield content if the handler queried it; a
  // denied read returns no body and no metadata for either caller shape.
  const { client } = buildFakeCoreClient({ document: null });

  const withMetadata = await readDocumentContent(
    { documentId: 'other-tenant-doc', includeMetadata: true },
    client,
  );
  const withoutMetadata = await readDocumentContent(
    { documentId: 'other-tenant-doc', includeMetadata: false },
    client,
  );

  assert.equal(withMetadata.status, 'DOCUMENT_NOT_FOUND');
  assert.equal(withMetadata.blocknote, null);
  assert.equal(withMetadata.metadata, null);
  assert.equal(withoutMetadata.status, 'DOCUMENT_NOT_FOUND');
  assert.equal(withoutMetadata.blocknote, null);
});

test('a blank documentId is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await readDocumentContent({ documentId: '   ' }, client);

  assert.deepEqual(result, {
    status: 'INVALID_INPUT',
    documentId: '',
    includeMetadata: true,
    blocknote: null,
    metadata: null,
  });
  assert.deepEqual(calls, []);
});

test('a missing documentId is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await readDocumentContent({}, client);

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});

test('a non-boolean includeMetadata is refused before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const result = await readDocumentContent(
    { documentId: 'document-1', includeMetadata: 'no' as never },
    client,
  );

  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});

test('includeMetadata null falls back to the default', async () => {
  const { client } = buildFakeCoreClient({ document: buildDocument() });

  const result = await readDocumentContent(
    { documentId: 'document-1', includeMetadata: null as never },
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.includeMetadata, true);
  assert.equal(result.metadata?.kind, 'DOCUMENT');
});
