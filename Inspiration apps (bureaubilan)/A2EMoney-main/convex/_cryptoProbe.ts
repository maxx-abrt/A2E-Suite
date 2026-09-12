import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { decryptField, encryptField, encryptionEnabled } from "./lib/crypto"

/**
 * TEMPORARY availability probe: confirms Web Crypto (HKDF + AES-256-GCM) works
 * inside the Convex runtime for BOTH queries and mutations. Deleted once the
 * cutover is verified.
 */
export const probe = mutation({
  args: { workspaceId: v.string(), value: v.string() },
  handler: async (_ctx, { workspaceId, value }) => {
    const enabled = encryptionEnabled()
    if (!enabled) return { enabled, ok: false, reason: "A2E_ENCRYPTION_KEY missing" }
    const ct = await encryptField(workspaceId, "probe", "value", value)
    const back = await decryptField(workspaceId, "probe", "value", ct)
    const wrongCtx = await decryptField(workspaceId, "probe", "other", ct)
    const wrongWs = await decryptField(workspaceId + "x", "probe", "value", ct)
    return {
      enabled,
      ok: back === value && wrongCtx === "" && wrongWs === "",
      sample: ct.slice(0, 44),
      roundTrip: back === value,
      aadBound: wrongCtx === "",
      workspaceBound: wrongWs === "",
    }
  },
})

export const probeQuery = query({
  args: { workspaceId: v.string(), value: v.string() },
  handler: async (_ctx, { workspaceId, value }) => {
    if (!encryptionEnabled()) return { enabled: false, ok: false }
    const ct = await encryptField(workspaceId, "probe", "value", value)
    const back = await decryptField(workspaceId, "probe", "value", ct)
    return { enabled: true, ok: back === value }
  },
})
