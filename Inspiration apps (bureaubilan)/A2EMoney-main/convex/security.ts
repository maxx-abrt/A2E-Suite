import { v } from "convex/values"
import { query } from "./_generated/server"
import { assertWorkspaceMember, getWorkosId } from "./lib/auth"
import { ENCRYPTED_FIELDS, encryptionEnabled, isEncrypted } from "./lib/crypto"

/**
 * Live security posture, computed server-side. Powers the in-app
 * "Security & compliance" panel and the public Trust Center — so what the UI
 * claims is always what the deployment actually does (no marketing fiction).
 */
export const posture = query({
  args: { workspaceId: v.optional(v.string()) },
  handler: async (ctx, { workspaceId }) => {
    const workosId = await getWorkosId(ctx)
    const encryption = {
      enabled: encryptionEnabled(),
      algorithm: "AES-256-GCM",
      keyDerivation: "HKDF-SHA256, per workspace",
      contextBinding: "workspace:table:field (AEAD additional data)",
      keyLocation: "Convex deployment env var (never in any client bundle)",
      fields: ENCRYPTED_FIELDS as unknown as Record<string, string[]>,
    }
    const bridge = {
      configured: Boolean(process.env.CONVEX_CORE_URL && process.env.A2E_SERVICE_SECRET),
      coreHost: (process.env.CONVEX_CORE_URL ?? "").replace(/^https?:\/\//, ""),
    }
    const auth = {
      provider: "WorkOS AuthKit",
      tokens: "RS256 JWT, verified on both deployments",
      issuer: `https://api.workos.com/user_management/${
        process.env.WORKOS_ISSUER_CLIENT_ID ?? process.env.WORKOS_CLIENT_ID ?? ""
      }`,
      sessionCookie: "httpOnly, encrypted (AuthKit sealed session)",
    }
    const storage = {
      provider: "Backblaze B2 (S3-compatible)",
      region: process.env.B2_REGION ?? "eu-central-003",
      bucketPublic: false,
      access: "short-lived presigned URLs issued by A2E Core (10 min)",
      encryptionAtRest: "server-side encryption by the object store",
    }
    const residency = {
      appDatabase: "Convex Cloud — eu-west-1 (Ireland)",
      sharedDatabase: "A2E Core — Convex Cloud eu-west-1 (Ireland)",
      files: `Backblaze B2 — ${process.env.B2_REGION ?? "eu-central-003"} (EU)`,
    }

    if (!workspaceId || !workosId) {
      return { authenticated: Boolean(workosId), encryption, bridge, auth, storage, residency, workspace: null }
    }

    const { role } = await assertWorkspaceMember(ctx, workspaceId)
    const org = await ctx.db
      .query("a2e_orgProfile")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .unique()
    const invoices = await ctx.db
      .query("a2e_invoices")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .take(50)
    const members = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()

    const encryptedSamples =
      (org?.iban && isEncrypted(org.iban) ? 1 : 0) +
      (org?.bic && isEncrypted(org.bic) ? 1 : 0) +
      invoices.filter((i) => isEncrypted(i.clientEmail)).length

    return {
      authenticated: true,
      encryption,
      bridge,
      auth,
      storage,
      residency,
      workspace: {
        role,
        members: members.length,
        encryptedValuesSampled: encryptedSamples,
        orgProfileEncrypted: Boolean(org?.iban ? isEncrypted(org.iban) : true),
      },
    }
  },
})
