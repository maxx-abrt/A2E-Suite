import { v } from "convex/values"
import { internalMutation, mutation } from "./_generated/server"
import { assertWorkspaceMember, requireWorkosId } from "./lib/auth"
import { encryptField, isEncrypted } from "./lib/crypto"

/**
 * One-off maintenance for the A2E Core cutover (Pattern A).
 *
 * `wipeLegacy` drains the pre-core tables that Bilan no longer declares
 * (its own users/workspaces/memberships/invitations/notifications/activities/
 * tasks/clients/documents, and the Convex-Auth tables). They contain personal
 * data that must not linger after the shared layer took over (GDPR minimisation).
 *
 * `encryptExisting` back-fills field-level encryption on rows written before the
 * key existed — idempotent, safe to re-run.
 */

const LEGACY_TABLES = [
  "users",
  "authIdentities",
  "authAccounts",
  "authSessions",
  "authRefreshTokens",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
  "workspaces",
  "memberships",
  "invitations",
  "notifications",
  "activities",
  "tasks",
  "a2e_clients",
  "a2e_documents",
] as const

export const wipeLegacy = internalMutation({
  args: { batch: v.optional(v.number()) },
  handler: async (ctx, { batch }) => {
    const limit = batch ?? 500
    const report: Record<string, number | string> = {}
    for (const table of LEGACY_TABLES) {
      try {
        const rows = await (ctx.db as any).query(table).take(limit)
        for (const row of rows) await ctx.db.delete(row._id)
        report[table] = rows.length
      } catch (error) {
        report[table] = `skipped (${(error as Error).message.slice(0, 60)})`
      }
    }
    return report
  },
})

/** Drops the orphan `flux_*` tables that never belonged to Bilan. */
export const wipeForeign = internalMutation({
  args: { batch: v.optional(v.number()) },
  handler: async (ctx, { batch }) => {
    const limit = batch ?? 500
    const tables = [
      "flux_databaseRows",
      "flux_databases",
      "flux_documentTags",
      "flux_documentVersions",
      "flux_documents",
      "flux_events",
      "flux_favorites",
      "flux_tags",
      "flux_taskComments",
      "flux_taskMeta",
      "flux_userPrefs",
    ]
    const report: Record<string, number | string> = {}
    for (const table of tables) {
      try {
        const rows = await (ctx.db as any).query(table).take(limit)
        for (const row of rows) await ctx.db.delete(row._id)
        report[table] = rows.length
      } catch (error) {
        report[table] = `skipped (${(error as Error).message.slice(0, 60)})`
      }
    }
    return report
  },
})

/**
 * Drops Bilan domain rows that still point at a pre-core (local) workspace id —
 * orphans after the cutover. Rows belonging to a real core workspace are kept.
 */
export const wipeOrphans = internalMutation({
  args: { keepWorkspaceIds: v.array(v.string()) },
  handler: async (ctx, { keepWorkspaceIds }) => {
    const known = new Set(keepWorkspaceIds)
    const tables = [
      "a2e_invoices",
      "a2e_expenses",
      "a2e_budgets",
      "a2e_categories",
      "a2e_fiches",
      "a2e_grantReports",
      "a2e_bookSheets",
      "a2e_bookEntries",
      "a2e_orgProfile",
      "projects",
      "a2e_activity",
    ] as const
    const report: Record<string, number> = {}
    for (const table of tables) {
      const rows = await ctx.db.query(table as any).collect()
      let removed = 0
      for (const row of rows) {
        if (!known.has((row as any).workspaceId)) {
          await ctx.db.delete(row._id)
          removed++
        }
      }
      report[table] = removed
    }
    return report
  },
})

/** Encrypts sensitive fields on pre-existing rows of one workspace (idempotent). */
export const encryptExisting = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    await assertWorkspaceMember(ctx, workspaceId, "admin")
    let updated = 0

    const org = await ctx.db
      .query("a2e_orgProfile")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .unique()
    if (org) {
      const patch: Record<string, string> = {}
      for (const field of ["iban", "bic", "siret", "rna", "address", "phone", "email", "representativeName"] as const) {
        const value = org[field]
        if (typeof value === "string" && value && !isEncrypted(value)) {
          patch[field] = await encryptField(workspaceId, "a2e_orgProfile", field, value)
        }
      }
      if (Object.keys(patch).length) {
        await ctx.db.patch(org._id, patch)
        updated++
      }
    }

    const invoices = await ctx.db
      .query("a2e_invoices")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()
    for (const invoice of invoices) {
      const patch: Record<string, string> = {}
      for (const field of ["clientEmail", "clientAddress", "notes"] as const) {
        const value = invoice[field]
        if (typeof value === "string" && value && !isEncrypted(value)) {
          patch[field] = await encryptField(workspaceId, "a2e_invoices", field, value)
        }
      }
      if (Object.keys(patch).length) {
        await ctx.db.patch(invoice._id, patch)
        updated++
      }
    }

    const expenses = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()
    for (const expense of expenses) {
      const patch: Record<string, string> = {}
      for (const field of ["notes", "paymentMethod"] as const) {
        const value = expense[field]
        if (typeof value === "string" && value && !isEncrypted(value)) {
          patch[field] = await encryptField(workspaceId, "a2e_expenses", field, value)
        }
      }
      if (Object.keys(patch).length) {
        await ctx.db.patch(expense._id, patch)
        updated++
      }
    }

    return { updated }
  },
})

/**
 * Repoints every Bilan row of a legacy (pre-core) workspace id onto the core
 * workspace id the owner just claimed. Kept for safety even though the prod
 * dataset was reset — idempotent and membership-checked.
 */
export const repointWorkspace = mutation({
  args: { fromWorkspaceId: v.string(), toWorkspaceId: v.string() },
  handler: async (ctx, { fromWorkspaceId, toWorkspaceId }) => {
    await requireWorkosId(ctx)
    await assertWorkspaceMember(ctx, toWorkspaceId, "owner")
    const tables = [
      "a2e_invoices",
      "a2e_expenses",
      "a2e_budgets",
      "a2e_categories",
      "a2e_fiches",
      "a2e_grantReports",
      "a2e_bookSheets",
      "a2e_bookEntries",
      "a2e_orgProfile",
      "projects",
      "a2e_activity",
    ] as const
    const report: Record<string, number> = {}
    for (const table of tables) {
      const rows = await ctx.db
        .query(table as any)
        .withIndex("by_workspace", (q: any) => q.eq("workspaceId", fromWorkspaceId))
        .collect()
      for (const row of rows) await ctx.db.patch(row._id, { workspaceId: toWorkspaceId } as any)
      report[table] = rows.length
    }
    return report
  },
})
