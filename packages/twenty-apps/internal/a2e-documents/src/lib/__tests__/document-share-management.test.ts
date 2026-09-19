import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCreateDocumentShareRequest,
  buildDocumentSharePath,
  buildExpiryIso,
  findDocumentShareForDocument,
  hasSharePassphrase,
  INITIAL_DOCUMENT_SHARE_PANEL_STATE,
  reduceDocumentSharePanel,
  type DocumentSharePanelState,
  type ShareBodyEncryptor,
} from '../document-share-management.ts';

const FIXED_SUMMARY = {
  shareToken: 'tok-123',
  isPassphraseProtected: false,
  expiresAt: null,
};

const stubEncryptor: ShareBodyEncryptor = async () => ({
  encryptedBody: 'ciphertext',
  bodyIv: 'iv',
  bodySalt: 'salt',
});

test('the share path matches AppPath.DocumentShare', () => {
  assert.equal(buildDocumentSharePath('abc'), '/share/abc');
  assert.equal(buildDocumentSharePath('a/b'), '/share/a%2Fb');
});

test('the expiry picker value becomes the end of that UTC day', () => {
  assert.equal(
    buildExpiryIso('2026-10-01'),
    '2026-10-01T23:59:59.999Z',
  );
});

test('an empty, malformed or calendar-invalid expiry becomes null', () => {
  assert.equal(buildExpiryIso(''), null);
  assert.equal(buildExpiryIso('01/10/2026'), null);
  assert.equal(buildExpiryIso('2026-02-31'), null);
});

test('a passphrase counts as present only when it has content', () => {
  assert.equal(hasSharePassphrase(undefined), false);
  assert.equal(hasSharePassphrase(''), false);
  assert.equal(hasSharePassphrase('   '), false);
  assert.equal(hasSharePassphrase(' secret '), true);
});

test('without a passphrase the request carries the plaintext snapshot', async () => {
  const request = await buildCreateDocumentShareRequest({
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: 'corps',
    expiresAt: '2026-10-01T23:59:59.999Z',
    encryptShareBody: stubEncryptor,
  });

  assert.deepEqual(request, {
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: 'corps',
    encryptedBody: null,
    bodyIv: null,
    bodySalt: null,
    expiresAt: '2026-10-01T23:59:59.999Z',
  });
});

test('with a passphrase the request carries the ciphertext triple only', async () => {
  const request = await buildCreateDocumentShareRequest({
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: 'corps secret',
    passphrase: 'mot de passe',
    encryptShareBody: stubEncryptor,
  });

  assert.deepEqual(request, {
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: '',
    encryptedBody: 'ciphertext',
    bodyIv: 'iv',
    bodySalt: 'salt',
    expiresAt: null,
  });
});

test('the passphrase never appears in the request payload', async () => {
  const request = await buildCreateDocumentShareRequest({
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: 'corps',
    passphrase: 'top-secret-passphrase',
    encryptShareBody: stubEncryptor,
  });

  assert.ok(!JSON.stringify(request).includes('top-secret-passphrase'));
});

test('a whitespace-only passphrase falls back to plaintext', async () => {
  let encryptorCalled = false;
  const spyEncryptor: ShareBodyEncryptor = async () => {
    encryptorCalled = true;

    return { encryptedBody: 'x', bodyIv: 'y', bodySalt: 'z' };
  };

  const request = await buildCreateDocumentShareRequest({
    documentRecordId: 'doc-1',
    titleSnapshot: 'Titre',
    bodySnapshot: 'corps',
    passphrase: '   ',
    encryptShareBody: spyEncryptor,
  });

  assert.equal(encryptorCalled, false);
  assert.equal(request.bodySnapshot, 'corps');
  assert.equal(request.encryptedBody, null);
});

test('findDocumentShareForDocument picks only the matching document', () => {
  const shares = [
    { documentRecordId: 'doc-2', ...FIXED_SUMMARY, shareToken: 'other' },
    { documentRecordId: 'doc-1', ...FIXED_SUMMARY },
  ];

  assert.deepEqual(findDocumentShareForDocument(shares, 'doc-1'), {
    shareToken: 'tok-123',
    isPassphraseProtected: false,
    expiresAt: null,
  });
  assert.equal(findDocumentShareForDocument(shares, 'doc-3'), null);
  assert.equal(findDocumentShareForDocument([], 'doc-1'), null);
});

test('the panel starts idle and a load with no share stays idle', () => {
  assert.deepEqual(reduceDocumentSharePanel(INITIAL_DOCUMENT_SHARE_PANEL_STATE, {
    type: 'loadSucceeded',
    share: null,
  }), INITIAL_DOCUMENT_SHARE_PANEL_STATE);
});

test('loading an existing share exposes it as ready + existing', () => {
  const state = reduceDocumentSharePanel(INITIAL_DOCUMENT_SHARE_PANEL_STATE, {
    type: 'loadSucceeded',
    share: { ...FIXED_SUMMARY, shareToken: 'existing-token' },
  });

  assert.equal(state.status, 'ready');
  assert.equal(state.shareToken, 'existing-token');
  assert.equal(state.isExisting, true);
  assert.equal(state.hasCopied, false);
});

test('create transitions idle → creating → ready with the new token', () => {
  const creating = reduceDocumentSharePanel(
    INITIAL_DOCUMENT_SHARE_PANEL_STATE,
    { type: 'createStarted' },
  );

  assert.equal(creating.status, 'creating');

  const ready = reduceDocumentSharePanel(creating, {
    type: 'createSucceeded',
    share: { ...FIXED_SUMMARY, isPassphraseProtected: true },
  });

  assert.equal(ready.status, 'ready');
  assert.equal(ready.shareToken, 'tok-123');
  assert.equal(ready.isPassphraseProtected, true);
  assert.equal(ready.isExisting, false);
});

test('a failed create falls back to the form with the error', () => {
  const state = reduceDocumentSharePanel(
    { ...INITIAL_DOCUMENT_SHARE_PANEL_STATE, status: 'creating' },
    { type: 'failed', message: 'boom' },
  );

  assert.equal(state.status, 'idle');
  assert.equal(state.error, 'boom');
  assert.equal(state.shareToken, null);
});

test('a failed action with a live token stays on the link', () => {
  const ready: DocumentSharePanelState = {
    ...INITIAL_DOCUMENT_SHARE_PANEL_STATE,
    status: 'ready',
    shareToken: 'tok-123',
    isExisting: true,
  };

  const state = reduceDocumentSharePanel(ready, {
    type: 'failed',
    message: 'revoke failed',
  });

  assert.equal(state.status, 'ready');
  assert.equal(state.error, 'revoke failed');
  assert.equal(state.shareToken, 'tok-123');
});

test('copy marks the token as copied', () => {
  const ready: DocumentSharePanelState = {
    ...INITIAL_DOCUMENT_SHARE_PANEL_STATE,
    status: 'ready',
    shareToken: 'tok-123',
  };

  assert.equal(
    reduceDocumentSharePanel(ready, { type: 'copySucceeded' }).hasCopied,
    true,
  );
});

test('revoke transitions ready → revoking → idle', () => {
  const ready: DocumentSharePanelState = {
    ...INITIAL_DOCUMENT_SHARE_PANEL_STATE,
    status: 'ready',
    shareToken: 'tok-123',
    isExisting: true,
  };

  const revoking = reduceDocumentSharePanel(ready, { type: 'revokeStarted' });

  assert.equal(revoking.status, 'revoking');

  assert.deepEqual(
    reduceDocumentSharePanel(revoking, { type: 'revokeSucceeded' }),
    INITIAL_DOCUMENT_SHARE_PANEL_STATE,
  );
});

test('reset clears any panel state', () => {
  const ready: DocumentSharePanelState = {
    ...INITIAL_DOCUMENT_SHARE_PANEL_STATE,
    status: 'ready',
    shareToken: 'tok-123',
    error: 'stale',
    hasCopied: true,
  };

  assert.deepEqual(
    reduceDocumentSharePanel(ready, { type: 'reset' }),
    INITIAL_DOCUMENT_SHARE_PANEL_STATE,
  );
});
