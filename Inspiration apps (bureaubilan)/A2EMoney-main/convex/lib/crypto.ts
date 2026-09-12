/**
 * Bilan field-level encryption — AES-256-GCM envelope encryption for sensitive
 * financial / personal data stored in Bilan's own Convex deployment.
 *
 * Design (fail-closed):
 *  - One root key, `A2E_ENCRYPTION_KEY` (32 random bytes, base64), set on the
 *    Convex deployment only (`npx convex env set`). Never shipped to clients.
 *  - Per-workspace data-encryption key derived with HKDF-SHA256
 *    (`salt = "a2e-bilan-enc-v1"`, `info = "ws:<workspaceId>"`), so a leaked
 *    ciphertext cannot be moved between workspaces.
 *  - AES-256-GCM with a fresh 96-bit IV per value, and the tuple
 *    `workspace:table:field` bound as Additional Authenticated Data — a
 *    ciphertext copied into another column or row fails to decrypt.
 *  - Stored format: `enc.v1.<base64url(iv)>.<base64url(ciphertext||tag)>`.
 *  - Plaintext values written before encryption was enabled keep working
 *    (`decryptField` returns them untouched) — additive, zero-downtime.
 */

const PREFIX = "enc.v1."
const SALT = "a2e-bilan-enc-v1"

const enc = new TextEncoder()
const dec = new TextDecoder()

function b64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function unb64url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"))
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}

function rootBytes(): Uint8Array | null {
  const raw = process.env.A2E_ENCRYPTION_KEY
  if (!raw) return null
  try {
    const bytes = unb64url(raw.trim())
    return bytes.byteLength >= 32 ? bytes.slice(0, 32) : null
  } catch {
    return null
  }
}

/** True when the deployment is configured to encrypt sensitive fields. */
export function encryptionEnabled(): boolean {
  return rootBytes() !== null
}

const dekCache = new Map<string, Promise<CryptoKey>>()

function deriveDek(workspaceId: string): Promise<CryptoKey> {
  const cached = dekCache.get(workspaceId)
  if (cached) return cached
  const promise = (async () => {
    const root = rootBytes()
    if (!root) throw new Error("Encryption is not configured (A2E_ENCRYPTION_KEY missing)")
    const hkdf = await crypto.subtle.importKey("raw", root as BufferSource, "HKDF", false, ["deriveKey"])
    return await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: enc.encode(SALT) as BufferSource,
        info: enc.encode(`ws:${workspaceId}`) as BufferSource,
      },
      hkdf,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
  })()
  dekCache.set(workspaceId, promise)
  return promise
}

const aad = (workspaceId: string, table: string, field: string) => enc.encode(`${workspaceId}:${table}:${field}`)

export function isEncrypted(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PREFIX)
}

/** Encrypts a value for storage. Throws when encryption is not configured (fail-closed). */
export async function encryptField(
  workspaceId: string,
  table: string,
  field: string,
  plaintext: string,
): Promise<string> {
  if (plaintext === "") return ""
  const key = await deriveDek(workspaceId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource, additionalData: aad(workspaceId, table, field) as BufferSource },
    key,
    enc.encode(plaintext) as BufferSource,
  )
  return `${PREFIX}${b64url(iv)}.${b64url(new Uint8Array(ct))}`
}

/** Decrypts a stored value; passes legacy plaintext through unchanged. */
export async function decryptField(
  workspaceId: string,
  table: string,
  field: string,
  stored: string,
): Promise<string> {
  if (!isEncrypted(stored)) return stored
  const [ivPart, ctPart] = stored.slice(PREFIX.length).split(".")
  if (!ivPart || !ctPart) return ""
  try {
    const key = await deriveDek(workspaceId)
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: unb64url(ivPart) as BufferSource,
        additionalData: aad(workspaceId, table, field) as BufferSource,
      },
      key,
      unb64url(ctPart) as BufferSource,
    )
    return dec.decode(plain)
  } catch {
    // Wrong key / tampered ciphertext: never leak raw bytes.
    return ""
  }
}

export async function encryptOptional(
  workspaceId: string,
  table: string,
  field: string,
  value: string | undefined | null,
): Promise<string | undefined> {
  if (value === undefined || value === null || value === "") return undefined
  return await encryptField(workspaceId, table, field, value)
}

export async function decryptOptional(
  workspaceId: string,
  table: string,
  field: string,
  value: string | undefined | null,
): Promise<string | undefined> {
  if (value === undefined || value === null || value === "") return undefined
  return await decryptField(workspaceId, table, field, value)
}

/** Encrypts every listed field of a patch/insert payload in place-ish (returns a copy). */
export async function encryptFields<T extends Record<string, any>>(
  workspaceId: string,
  table: string,
  doc: T,
  fields: readonly (keyof T & string)[],
): Promise<T> {
  const out: Record<string, any> = { ...doc }
  for (const field of fields) {
    const value = out[field]
    if (typeof value === "string" && value !== "" && !isEncrypted(value)) {
      out[field] = await encryptField(workspaceId, table, field, value)
    }
  }
  return out as T
}

/** Decrypts every listed field of a document read from the DB (returns a copy). */
export async function decryptFields<T extends Record<string, any>>(
  workspaceId: string,
  table: string,
  doc: T,
  fields: readonly (keyof T & string)[],
): Promise<T> {
  const out: Record<string, any> = { ...doc }
  for (const field of fields) {
    const value = out[field]
    if (typeof value === "string" && value !== "") {
      out[field] = await decryptField(workspaceId, table, field, value)
    }
  }
  return out as T
}

export async function decryptMany<T extends Record<string, any>>(
  workspaceId: string,
  table: string,
  docs: T[],
  fields: readonly (keyof T & string)[],
): Promise<T[]> {
  return await Promise.all(docs.map((doc) => decryptFields(workspaceId, table, doc, fields)))
}

/**
 * Which fields are encrypted at rest, per table. Single source of truth for the
 * Trust Center / security status panel, so the UI never over-promises.
 */
export const ENCRYPTED_FIELDS = {
  a2e_orgProfile: ["iban", "bic", "siret", "rna", "address", "phone", "email", "representativeName"],
  a2e_invoices: ["clientEmail", "clientAddress", "notes"],
  a2e_expenses: ["notes", "paymentMethod"],
  a2e_bookEntries: ["cells.method", "cells.notes"],
  a2e_subventionSaved: ["notes"],
  a2e_fiches: [],
  a2e_grantReports: [],
} as const
