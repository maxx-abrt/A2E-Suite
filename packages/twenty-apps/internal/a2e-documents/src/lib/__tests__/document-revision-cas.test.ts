import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DOCUMENT_REVISION_REPAIR_PREFIX,
  FIRST_DOCUMENT_REVISION,
  readDocumentRevisionBody,
  resolveDocumentSaveCas,
} from '../document-revision-cas.ts';

const content = (blocknote: string | null) => ({ blocknote, markdown: null });

test('readDocumentRevisionBody reads a blocknote string and normalizes the rest', () => {
  assert.equal(readDocumentRevisionBody(content('{"v":1}')), '{"v":1}');
  assert.equal(readDocumentRevisionBody({ markdown: 'x' }), null);
  assert.equal(readDocumentRevisionBody(null), null);
  assert.equal(readDocumentRevisionBody(undefined), null);
});

test('a write whose expected revision matches the committed one is accepted', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('old'), contentRevision: 'docrev-1' },
    after: {
      content: content('new'),
      contentRevision: 'docrev-2',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'accepted' });
});

test('the first tracked write expects the first-revision sentinel', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: null, contentRevision: null },
    after: {
      content: content('new'),
      contentRevision: 'docrev-1',
      contentBaseRevision: FIRST_DOCUMENT_REVISION,
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'accepted' });
});

test('a stale write is repaired back to the winning committed body', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('winner'), contentRevision: 'docrev-2' },
    after: {
      content: content('stale'),
      contentRevision: 'docrev-3',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, {
    action: 'repair',
    winnerBody: 'winner',
    winnerRevision: 'docrev-2',
    repairBaseRevision: `${DOCUMENT_REVISION_REPAIR_PREFIX}docrev-3`,
  });
});

test('a repair sentinel is never re-classified as stale (loop termination)', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('stale'), contentRevision: 'docrev-3' },
    after: {
      content: content('winner'),
      contentRevision: 'docrev-2',
      contentBaseRevision: `${DOCUMENT_REVISION_REPAIR_PREFIX}docrev-3`,
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'untracked' });
});

test('an untracked writer (no expected token) stays last-write-wins', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('winner'), contentRevision: 'docrev-2' },
    after: { content: content('stale'), contentRevision: 'docrev-3' },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'untracked' });
});

test('an empty expected token is treated as untracked', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('winner'), contentRevision: 'docrev-2' },
    after: {
      content: content('stale'),
      contentRevision: 'docrev-3',
      contentBaseRevision: '',
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'untracked' });
});

test('an update that does not change content never repairs', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['title'],
    before: { content: content('winner'), contentRevision: 'docrev-2' },
    after: {
      content: content('stale'),
      contentRevision: 'docrev-3',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'content-unchanged' });
});

test('a mismatched token with an identical body is not rewritten', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('same'), contentRevision: 'docrev-2' },
    after: {
      content: content('same'),
      contentRevision: 'docrev-3',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, { action: 'none', reason: 'content-unchanged' });
});

test('a stale write over an empty committed body repairs to null', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: null, contentRevision: 'docrev-2' },
    after: {
      content: content('stale'),
      contentRevision: 'docrev-3',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, {
    action: 'repair',
    winnerBody: null,
    winnerRevision: 'docrev-2',
    repairBaseRevision: `${DOCUMENT_REVISION_REPAIR_PREFIX}docrev-3`,
  });
});

test('a stale write against an untracked committed row repairs to the sentinel head', () => {
  const resolution = resolveDocumentSaveCas({
    updatedFields: ['content'],
    before: { content: content('winner'), contentRevision: null },
    after: {
      content: content('stale'),
      contentRevision: 'docrev-3',
      contentBaseRevision: 'docrev-1',
    },
  });

  assert.deepEqual(resolution, {
    action: 'repair',
    winnerBody: 'winner',
    winnerRevision: FIRST_DOCUMENT_REVISION,
    repairBaseRevision: `${DOCUMENT_REVISION_REPAIR_PREFIX}docrev-3`,
  });
});

test('missing properties never throw and stay untracked', () => {
  assert.deepEqual(resolveDocumentSaveCas(null), {
    action: 'none',
    reason: 'untracked',
  });
  assert.deepEqual(resolveDocumentSaveCas({}), {
    action: 'none',
    reason: 'untracked',
  });
});
