import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertWorkspaceMember, logActivity } from "./lib/auth"
import { decryptFields, encryptOptional } from "./lib/crypto"

/**
 * Organisation legal profile — stored once per workspace and auto-prefilled into
 * every legal document (CERFA, reçus fiscaux, conventions).
 *
 * Bank details and contact identifiers are ENCRYPTED AT REST with AES-256-GCM
 * (per-workspace key, context-bound) — see `convex/lib/crypto.ts`. They are
 * decrypted only for authenticated members of the owning workspace.
 */

const ENCRYPTED = [
  "iban",
  "bic",
  "siret",
  "rna",
  "address",
  "phone",
  "email",
  "representativeName",
] as const

export const get = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    await assertWorkspaceMember(ctx, workspaceId)
    const row = await ctx.db
      .query("a2e_orgProfile")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .unique()
    if (!row) return null
    return await decryptFields(workspaceId, "a2e_orgProfile", row, ENCRYPTED)
  },
})

export const upsert = mutation({
  args: {
    workspaceId: v.string(),
    legalName: v.optional(v.string()),
    shortName: v.optional(v.string()),
    objet: v.optional(v.string()),
    rna: v.optional(v.string()),
    siret: v.optional(v.string()),
    address: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    city: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    representativeName: v.optional(v.string()),
    representativeRole: v.optional(v.string()),
    iban: v.optional(v.string()),
    bic: v.optional(v.string()),
    rupRecognized: v.optional(v.boolean()),
    fiscalRegime: v.optional(v.string()),
    /** Used to pre-filter subventions (association, entreprise, collectivite…). */
    structureKind: v.optional(v.string()),
    /** Default prompt of the subvention AI matcher. */
    projectSummary: v.optional(v.string()),
    headcount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(ctx, args.workspaceId, "member")
    const { workspaceId, ...rest } = args
    const now = Date.now()

    const payload: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue
      payload[key] = (ENCRYPTED as readonly string[]).includes(key)
        ? await encryptOptional(workspaceId, "a2e_orgProfile", key, value as string)
        : value
    }

    const existing = await ctx.db
      .query("a2e_orgProfile")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { ...payload, updatedAt: now })
      await logActivity(ctx, {
        workspaceId,
        actorId: userId,
        action: "org.updated",
        targetType: "orgProfile",
        targetId: existing._id,
      })
      return existing._id
    }

    const id = await ctx.db.insert("a2e_orgProfile", {
      workspaceId,
      ...(payload as any),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await logActivity(ctx, {
      workspaceId,
      actorId: userId,
      action: "org.created",
      targetType: "orgProfile",
      targetId: id,
    })
    return id
  },
})
