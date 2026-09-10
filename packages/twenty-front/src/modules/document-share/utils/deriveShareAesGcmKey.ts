// Client-side AES-GCM per the Bureau pattern: the passphrase never leaves the
// browser. The client encrypts the body snapshot before posting it; the server
// stores only ciphertext + IV + salt, and the GCM auth tag is the passphrase
// verification — no bcrypt round-trip.
const PBKDF2_ITERATIONS = 210_000;

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
): Promise<{
  encryptedBody: string;
  bodyIv: string;
  bodySalt: string;
}> => {
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
