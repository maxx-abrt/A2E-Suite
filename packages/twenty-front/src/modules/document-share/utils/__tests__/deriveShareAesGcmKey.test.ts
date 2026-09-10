import {
  decryptShareBody,
  encryptShareBody,
} from '@/document-share/utils/deriveShareAesGcmKey';

describe('deriveShareAesGcmKey', () => {
  it('should decrypt a body encrypted with the same passphrase', async () => {
    const bodySnapshot = '{"type":"doc","content":[{"type":"paragraph"}]}';
    const passphrase = 'ma phrase secrète';

    const { encryptedBody, bodyIv, bodySalt } = await encryptShareBody(
      bodySnapshot,
      passphrase,
    );

    // Salt must be per-encryption so two shares with the same passphrase do
    // not share a key.
    const second = await encryptShareBody(bodySnapshot, passphrase);

    expect(second.bodySalt).not.toBe(bodySalt);

    const decrypted = await decryptShareBody(
      encryptedBody,
      bodyIv,
      passphrase,
      bodySalt,
    );

    expect(decrypted).toBe(bodySnapshot);
  });

  it('should fail decryption with a wrong passphrase (GCM auth)', async () => {
    const { encryptedBody, bodyIv, bodySalt } = await encryptShareBody(
      'secret',
      'right-passphrase',
    );

    await expect(
      decryptShareBody(encryptedBody, bodyIv, 'wrong-passphrase', bodySalt),
    ).rejects.toThrow();
  });
});
