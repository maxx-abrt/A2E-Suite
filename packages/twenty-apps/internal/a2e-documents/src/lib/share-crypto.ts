// Local port of twenty-front's `deriveShareAesGcmKey` util: the app does not
// declare twenty-shared and cannot import twenty-front modules, so the
// passphrase crypto is carried here as a pure module. It MUST stay
// byte-compatible with twenty-front `document-share/utils/deriveShareAesGcmKey`
// so the guest page can decrypt what the owner-side panel encrypted: same
// PBKDF2-SHA256 210k iterations, 16-byte salt, 12-byte IV, base64 fields.
//
// The passphrase itself never appears in the payload; the server only stores
// the ciphertext triple, and the GCM auth tag IS the verification.
const PBKDF2_ITERATIONS = 210_000;

export type EncryptedShareBody = {
  encryptedBody: string;
  bodyIv: string;
  bodySalt: string;
};

const encodeBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const decodeBase64 = (base64Value: string): Uint8Array =>
  Uint8Array.from(atob(base64Value), (character) => character.charCodeAt(0));

export const deriveShareAesGcmKey = async (
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

export const encryptShareBody = async (
  bodySnapshot: string,
  passphrase: string,
): Promise<EncryptedShareBody> => {
  const bodySalt = encodeBase64(crypto.getRandomValues(new Uint8Array(16)));
  const bodyIv = encodeBase64(crypto.getRandomValues(new Uint8Array(12)));
  const aesGcmKey = await deriveShareAesGcmKey(
    passphrase,
    decodeBase64(bodySalt),
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: decodeBase64(bodyIv) as unknown as BufferSource },
    aesGcmKey,
    new TextEncoder().encode(bodySnapshot),
  );

  return {
    encryptedBody: encodeBase64(new Uint8Array(encrypted)),
    bodyIv,
    bodySalt,
  };
};

export const decryptShareBody = async (
  encryptedBodyBase64: string,
  ivBase64: string,
  passphrase: string,
  saltBase64: string,
): Promise<string> => {
  const aesGcmKey = await deriveShareAesGcmKey(
    passphrase,
    decodeBase64(saltBase64),
  );

  const decryptedBody = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decodeBase64(ivBase64) as unknown as BufferSource,
    },
    aesGcmKey,
    decodeBase64(encryptedBodyBase64) as unknown as BufferSource,
  );

  return new TextDecoder().decode(decryptedBody);
};
