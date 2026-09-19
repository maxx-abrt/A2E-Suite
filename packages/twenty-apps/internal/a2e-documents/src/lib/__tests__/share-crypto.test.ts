import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decryptShareBody,
  encryptShareBody,
} from '../share-crypto.ts';

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

test('an encrypted body decrypts with the same passphrase', async () => {
  const bodySnapshot = '{"type":"doc","content":[{"type":"paragraph"}]}';
  const passphrase = 'ma phrase secrète';

  const { encryptedBody, bodyIv, bodySalt } = await encryptShareBody(
    bodySnapshot,
    passphrase,
  );

  assert.equal(
    await decryptShareBody(encryptedBody, bodyIv, passphrase, bodySalt),
    bodySnapshot,
  );
});

test('the salt is per-encryption so two shares never share a key', async () => {
  const first = await encryptShareBody('secret', 'passphrase');
  const second = await encryptShareBody('secret', 'passphrase');

  assert.notEqual(first.bodySalt, second.bodySalt);
  assert.notEqual(first.bodyIv, second.bodyIv);
});

test('a wrong passphrase fails the GCM auth tag', async () => {
  const { encryptedBody, bodyIv, bodySalt } = await encryptShareBody(
    'secret',
    'right-passphrase',
  );

  await assert.rejects(
    decryptShareBody(encryptedBody, bodyIv, 'wrong-passphrase', bodySalt),
  );
});

test('the ciphertext never contains the plaintext and is base64', async () => {
  const bodySnapshot = 'contenu confidentiel';

  const { encryptedBody, bodyIv, bodySalt } = await encryptShareBody(
    bodySnapshot,
    'passphrase',
  );

  assert.notEqual(encryptedBody, bodySnapshot);
  assert.ok(BASE64_PATTERN.test(encryptedBody));
  assert.ok(BASE64_PATTERN.test(bodyIv));
  assert.ok(BASE64_PATTERN.test(bodySalt));
});
