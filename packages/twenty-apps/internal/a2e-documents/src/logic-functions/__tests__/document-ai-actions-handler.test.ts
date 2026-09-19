import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runDocumentAction } from '../handlers/document-action-handler.ts';
import {
  buildDocument,
  buildFakeCoreClient,
  findQuery,
} from './document-tool-test-fixtures.ts';

// The three P9.2 document actions delegate to the single US-013 authorized
// read path. These specs pin that each action (a) validates its own options
// before any read, (b) performs exactly the caller-scoped `document(id)` read,
// and (c) fails closed to one typed status for a missing OR unauthorized
// document without leaking content. Nothing is ever written.

test('summarize returns the authorized body and metadata', async () => {
  const { client, calls } = buildFakeCoreClient({
    document: buildDocument({ content: { blocknote: '[{"type":"paragraph"}]' } }),
  });

  const result = await runDocumentAction(
    { documentId: 'document-1' },
    'SUMMARIZE',
    client,
  );

  assert.deepEqual(result, {
    status: 'READ',
    action: 'SUMMARIZE',
    documentId: 'document-1',
    blocknote: '[{"type":"paragraph"}]',
    metadata: {
      id: 'document-1',
      title: 'Note de réunion',
      kind: 'DOCUMENT',
      updatedAt: '2026-09-19T09:00:00.000Z',
    },
    options: { targetLanguage: null, tone: null, maxWords: null },
  });
  // Exactly the one caller-scoped read, by id — no write, no second query.
  assert.deepEqual(findQuery(calls, 'document')?.args, { id: 'document-1' });
  assert.equal(calls.length, 1);
});

test('summarize forwards a valid word budget', async () => {
  const { client } = buildFakeCoreClient({ document: buildDocument() });

  const result = await runDocumentAction(
    { documentId: 'document-1', maxWords: 120 },
    'SUMMARIZE',
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.options.maxWords, 120);
});

test('summarize refuses a non-integer or out-of-range word budget before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const fractional = await runDocumentAction(
    { documentId: 'document-1', maxWords: 12.5 },
    'SUMMARIZE',
    client,
  );
  const tooLarge = await runDocumentAction(
    { documentId: 'document-1', maxWords: 5000 },
    'SUMMARIZE',
    client,
  );
  const zero = await runDocumentAction(
    { documentId: 'document-1', maxWords: 0 },
    'SUMMARIZE',
    client,
  );

  assert.equal(fractional.status, 'INVALID_INPUT');
  assert.equal(tooLarge.status, 'INVALID_INPUT');
  assert.equal(zero.status, 'INVALID_INPUT');
  assert.equal(fractional.blocknote, null);
  assert.deepEqual(calls, []);
});

test('translate requires a target language before any read', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const missing = await runDocumentAction(
    { documentId: 'document-1' },
    'TRANSLATE',
    client,
  );
  const blank = await runDocumentAction(
    { documentId: 'document-1', targetLanguage: '   ' },
    'TRANSLATE',
    client,
  );
  const notAString = await runDocumentAction(
    { documentId: 'document-1', targetLanguage: 42 as never },
    'TRANSLATE',
    client,
  );

  assert.equal(missing.status, 'INVALID_INPUT');
  assert.equal(blank.status, 'INVALID_INPUT');
  assert.equal(notAString.status, 'INVALID_INPUT');
  assert.equal(missing.action, 'TRANSLATE');
  assert.deepEqual(calls, []);
});

test('translate trims the target language and reads once', async () => {
  const { client, calls } = buildFakeCoreClient({ document: buildDocument() });

  const result = await runDocumentAction(
    { documentId: 'document-1', targetLanguage: '  anglais  ' },
    'TRANSLATE',
    client,
  );

  assert.equal(result.status, 'READ');
  assert.equal(result.options.targetLanguage, 'anglais');
  assert.deepEqual(findQuery(calls, 'document')?.args, { id: 'document-1' });
  assert.equal(calls.length, 1);
});

test('improve-writing accepts an optional tone and refuses a blank one', async () => {
  const { client, calls } = buildFakeCoreClient({ document: buildDocument() });

  const valid = await runDocumentAction(
    { documentId: 'document-1', tone: 'concis' },
    'IMPROVE_WRITING',
    client,
  );
  const blank = await runDocumentAction(
    { documentId: 'document-1', tone: '   ' },
    'IMPROVE_WRITING',
    client,
  );

  assert.equal(valid.status, 'READ');
  assert.equal(valid.options.tone, 'concis');
  assert.equal(blank.status, 'INVALID_INPUT');
  // Only the valid call performed a read.
  assert.equal(calls.length, 1);
});

test('a missing or unauthorized document fails closed for every action', async () => {
  const { client } = buildFakeCoreClient({ document: null });

  const summarized = await runDocumentAction(
    { documentId: 'other-tenant-doc' },
    'SUMMARIZE',
    client,
  );
  const translated = await runDocumentAction(
    { documentId: 'other-tenant-doc', targetLanguage: 'anglais' },
    'TRANSLATE',
    client,
  );
  const improved = await runDocumentAction(
    { documentId: 'other-tenant-doc', tone: 'formel' },
    'IMPROVE_WRITING',
    client,
  );

  for (const result of [summarized, translated, improved]) {
    assert.equal(result.status, 'DOCUMENT_NOT_FOUND');
    assert.equal(result.blocknote, null);
    assert.equal(result.metadata, null);
  }
});

test('a blank documentId is refused before any read for every action', async () => {
  const { client, calls } = buildFakeCoreClient({});

  const summarized = await runDocumentAction(
    { documentId: '   ' },
    'SUMMARIZE',
    client,
  );
  const translated = await runDocumentAction(
    { documentId: '   ', targetLanguage: 'anglais' },
    'TRANSLATE',
    client,
  );
  const improved = await runDocumentAction(
    { documentId: '   ' },
    'IMPROVE_WRITING',
    client,
  );

  assert.equal(summarized.status, 'INVALID_INPUT');
  assert.equal(translated.status, 'INVALID_INPUT');
  assert.equal(improved.status, 'INVALID_INPUT');
  assert.deepEqual(calls, []);
});
