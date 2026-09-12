import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertWorkspaceMember, getWorkosId, requireWorkosId } from "./lib/auth"
import { decryptFields, decryptMany } from "./lib/crypto"

/**
 * GDPR toolkit for Bilan's own data (core exposes its own export for the shared
 * layer: `activities.exportWorkspace`).
 *
 * - art. 15 / 20 — access & portability: `exportWorkspace`, `exportMe`
 * - art. 17 — erasure, balanced against the French bookkeeping retention duty
 *   (10 years, art. L123-22 code de commerce): personal identifiers are removed
 *   or pseudonymised, accounting records themselves are retained.
 * - art. 7 — provable, versioned consent: `setConsent` / `consents`
 * - art. 30 — records of processing: `processingRegister`
 */

export const RETENTION = {
  accountingRecords: { years: 10, basis: "art. L123-22 code de commerce (legal obligation)" },
  auditTrail: { years: 3, basis: "security & accountability (legitimate interest)" },
  driveFilesTrash: { days: 30, basis: "operational recovery window (A2E Core)" },
  sessions: { hours: 24, basis: "WorkOS AuthKit sealed session" },
} as const

const ORG_ENC = [
  "iban",
  "bic",
  "siret",
  "rna",
  "address",
  "phone",
  "email",
  "representativeName",
] as const
const INVOICE_ENC = ["clientEmail", "clientAddress", "notes"] as const
const EXPENSE_ENC = ["notes", "paymentMethod"] as const

/** Full, decrypted portable export of everything Bilan holds for a workspace. */
export const exportWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, { workspaceId }) => {
    const { role } = await assertWorkspaceMember(ctx, workspaceId, "admin")

    const byWorkspace = async (table: any) =>
      await ctx.db
        .query(table)
        .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
        .collect()

    const [
      invoices,
      expenses,
      budgets,
      categories,
      fiches,
      grantReports,
      projects,
      sheets,
      entries,
      subventions,
      subventionRuns,
      activity,
    ] =
      await Promise.all([
        byWorkspace("a2e_invoices"),
        byWorkspace("a2e_expenses"),
        byWorkspace("a2e_budgets"),
        byWorkspace("a2e_categories"),
        byWorkspace("a2e_fiches"),
        byWorkspace("a2e_grantReports"),
        byWorkspace("projects"),
        byWorkspace("a2e_bookSheets"),
        byWorkspace("a2e_bookEntries"),
        byWorkspace("a2e_subventionSaved"),
        ctx.db
          .query("a2e_subventionRuns")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
        ctx.db
          .query("a2e_activity")
          .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
          .collect(),
      ])
    const orgRaw = await ctx.db
      .query("a2e_orgProfile")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .unique()
    const members = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()

    return {
      exportedAt: Date.now(),
      exportedByRole: role,
      app: "bilan",
      workspaceId,
      notice:
        "Bilan holds the financial records below. Shared data (workspace, members, roles, files, notifications, tasks, contacts) lives in A2E Core and is exported separately from the same screen.",
      retention: RETENTION,
      data: {
        organisation: orgRaw ? await decryptFields(workspaceId, "a2e_orgProfile", orgRaw, ORG_ENC) : null,
        invoices: await decryptMany(workspaceId, "a2e_invoices", invoices as any[], INVOICE_ENC),
        transactions: await decryptMany(workspaceId, "a2e_expenses", expenses as any[], EXPENSE_ENC),
        budgets,
        categories,
        projects,
        bookSheets: sheets,
        bookEntries: entries,
        fiches,
        grantReports,
        subventionApplications: await decryptMany(
          workspaceId,
          "a2e_subventionSaved",
          subventions as any[],
          ["notes"] as const,
        ),
        subventionSearches: subventionRuns,
        auditTrail: activity,
        membershipMirror: members.map((m) => ({ workosId: m.workosId, role: m.role, syncedAt: m.syncedAt })),
      },
    }
  },
})

/** Everything Bilan holds about the caller personally (art. 15). */
export const exportMe = query({
  args: {},
  handler: async (ctx) => {
    const workosId = await requireWorkosId(ctx)
    const profile = await ctx.db
      .query("a2e_directory")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .unique()
    const consents = await ctx.db
      .query("a2e_consents")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    const memberships = await ctx.db
      .query("coreMemberships")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    const actions = await ctx.db
      .query("a2e_activity")
      .withIndex("by_actor", (q) => q.eq("actorId", workosId))
      .take(1000)
    const requests = await ctx.db
      .query("a2e_dataRequests")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    return {
      exportedAt: Date.now(),
      subject: { workosId, ...(profile ?? {}) },
      consents,
      workspaces: memberships.map((m) => ({ workspaceId: m.workspaceId, name: m.name, role: m.role })),
      myActions: actions,
      previousRequests: requests,
      retention: RETENTION,
    }
  },
})

/**
 * art. 17 erasure for the caller: removes the identity record and consent trail,
 * pseudonymises their audit entries. Accounting rows stay (legal obligation) but
 * no longer point at an identifiable person.
 */
export const eraseMe = mutation({
  args: { confirm: v.literal("ERASE") },
  handler: async (ctx) => {
    const workosId = await requireWorkosId(ctx)
    const profile = await ctx.db
      .query("a2e_directory")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .unique()
    if (profile) await ctx.db.delete(profile._id)

    const consents = await ctx.db
      .query("a2e_consents")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    for (const row of consents) await ctx.db.delete(row._id)

    const actions = await ctx.db
      .query("a2e_activity")
      .withIndex("by_actor", (q) => q.eq("actorId", workosId))
      .take(4000)
    const pseudonym = `erased:${workosId.slice(-6)}`
    for (const row of actions) await ctx.db.patch(row._id, { actorId: pseudonym })

    await ctx.db.insert("a2e_dataRequests", {
      workosId: pseudonym,
      kind: "erasure",
      scope: "personal-identity",
      result: { profileDeleted: Boolean(profile), consents: consents.length, pseudonymisedActions: actions.length },
      createdAt: Date.now(),
    })
    return { profileDeleted: Boolean(profile), consents: consents.length, pseudonymisedActions: actions.length }
  },
})

/**
 * Owner-only wipe of every Bilan record of a workspace (art. 17 at workspace
 * level). Shared data stays in core — deleting a shared workspace is a core-side
 * decision — and core drive files are removed from the client with the core
 * mutations, so quota accounting stays correct.
 */
export const eraseWorkspaceData = mutation({
  args: { workspaceId: v.string(), confirm: v.literal("ERASE") },
  handler: async (ctx, { workspaceId }) => {
    const { workosId } = await assertWorkspaceMember(ctx, workspaceId, "owner")
    const counts: Record<string, number> = {}
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
      "a2e_subventionSaved",
      "a2e_subventionRuns",
      "projects",
    ] as const
    for (const table of tables) {
      const rows = await ctx.db
        .query(table as any)
        .withIndex("by_workspace", (q: any) => q.eq("workspaceId", workspaceId))
        .collect()
      for (const row of rows) await ctx.db.delete(row._id)
      counts[table] = rows.length
    }
    const activity = await ctx.db
      .query("a2e_activity")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
      .collect()
    for (const row of activity) await ctx.db.delete(row._id)
    counts.a2e_activity = activity.length

    await ctx.db.insert("a2e_dataRequests", {
      workosId,
      workspaceId,
      kind: "erasure",
      scope: "workspace-financial-data",
      result: counts,
      createdAt: Date.now(),
    })
    return counts
  },
})

// ------------------------------------------------------------------- consent

export const setConsent = mutation({
  args: { purpose: v.string(), granted: v.boolean(), version: v.string() },
  handler: async (ctx, args) => {
    const workosId = await requireWorkosId(ctx)
    await ctx.db.insert("a2e_consents", {
      workosId,
      purpose: args.purpose,
      granted: args.granted,
      version: args.version,
      createdAt: Date.now(),
    })
    return true
  },
})

export const consents = query({
  args: {},
  handler: async (ctx) => {
    const workosId = await getWorkosId(ctx)
    if (!workosId) return []
    const rows = await ctx.db
      .query("a2e_consents")
      .withIndex("by_workos", (q) => q.eq("workosId", workosId))
      .collect()
    // Latest decision per purpose.
    const latest = new Map<string, (typeof rows)[number]>()
    for (const row of rows) {
      const current = latest.get(row.purpose)
      if (!current || row.createdAt > current.createdAt) latest.set(row.purpose, row)
    }
    return [...latest.values()]
  },
})

/** art. 30 record of processing activities — rendered on the Trust Center. */
export const processingRegister = query({
  args: {},
  handler: async () => ({
    controller: "the workspace owner (association or company using Bilan)",
    processor: "A2E Suite — Bilan",
    purposes: [
      { purpose: "Bookkeeping, invoicing, budgeting", basis: "contract (art. 6.1.b)", retention: "10 years" },
      { purpose: "Legal French filings (CERFA, reçus fiscaux)", basis: "legal obligation (art. 6.1.c)", retention: "10 years" },
      { purpose: "Authentication & workspace access", basis: "contract (art. 6.1.b)", retention: "account lifetime" },
      { purpose: "Security audit trail", basis: "legitimate interest (art. 6.1.f)", retention: "3 years" },
      {
        purpose:
          "Grant matching assistant: the project description you type is sent to Google Gemini to be matched against the public funding catalogue. No accounting figure, no personal identifier and no document is sent.",
        basis: "consent (art. 6.1.a) — the feature is only used when you run a search",
        retention: "search history kept in your workspace until you delete it; model responses cached by content hash",
      },
    ],
    subProcessors: [
      { name: "Convex", role: "application database (Bilan + A2E Core)", location: "EU — Ireland (eu-west-1)" },
      { name: "WorkOS", role: "authentication (AuthKit)", location: "US — SCC/DPF" },
      { name: "Backblaze B2", role: "encrypted document storage", location: "EU — eu-central-003" },
      { name: "Vercel", role: "frontend hosting / edge", location: "EU region" },
      { name: "Resend", role: "transactional email", location: "EU/US — SCC" },
      {
        name: "Google (Gemini / AI Studio)",
        role: "grant matching assistant — receives only the project description you type",
        location: "US — SCC/DPF",
      },
    ],
    rights: ["access", "rectification", "erasure", "portability", "restriction", "objection"],
    contact: "privacy@association2e.org",
  }),
})
