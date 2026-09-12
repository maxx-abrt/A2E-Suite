import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { assertWorkspaceMember, logActivity } from "./lib/auth"
import {
  DEFAULT_BOOK_KEY,
  DEFAULT_COLUMNS,
  ENCRYPTED_CELLS,
  MANAGED_CELLS,
  decryptEntryCells,
  ensureDefaultSheet,
  syncExpenseEntry,
} from "./lib/defaultBook"
import { encryptOptional } from "./lib/crypto"

/**
 * THE BOOK ("Livre").
 *
 * A workspace has any number of free-form sheets PLUS exactly one system sheet
 * — the **journal automatique** (`systemKey: bilan.default.ledger`). That one is
 * written by the app itself on every movement (see `lib/defaultBook.ts`):
 * undeletable, managed columns read-only, badged in the UI, exportable as-is at
 * year end with every justificatif named.
 */

const columnValidator = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  width: v.optional(v.number()),
  options: v.optional(v.array(v.string())),
  formula: v.optional(v.string()),
  required: v.optional(v.boolean()),
  linkedType: v.optional(v.string()),
  managed: v.optional(v.boolean()),
})

export const listSheets = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    const sheets = await ctx.db
      .query("a2e_bookSheets")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect()
    // Row counts let the list show "142 lignes" without a second round-trip.
    const withCounts = await Promise.all(
      sheets.map(async (sheet) => {
        const rows = await ctx.db
          .query("a2e_bookEntries")
          .withIndex("by_sheet", (q) => q.eq("sheetId", sheet._id))
          .collect()
        return {
          ...sheet,
          entryCount: rows.length,
          autoCount: rows.filter((r) => r.auto).length,
          proofCount: rows.reduce((sum, r) => sum + (r.attachments?.length ?? 0), 0),
        }
      }),
    )
    // Default journal always first.
    return withCounts.sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)))
  },
})

/** Creates the auto-journal on demand (idempotent) and back-fills past movements. */
export const ensureDefault = mutation({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(ctx, args.workspaceId, "member")
    const sheetId = await ensureDefaultSheet(ctx, args.workspaceId, userId)
    // Back-fill: movements recorded before the journal existed (or before this
    // feature shipped) get their line now. Bounded + idempotent.
    const existing = await ctx.db
      .query("a2e_bookEntries")
      .withIndex("by_sheet", (q) => q.eq("sheetId", sheetId))
      .collect()
    const already = new Set(existing.filter((e) => e.auto).map((e) => e.sourceId))
    const movements = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .take(500)
    let backfilled = 0
    for (const movement of movements) {
      if (already.has(String(movement._id))) continue
      await syncExpenseEntry(ctx, movement)
      backfilled++
    }
    return { sheetId, backfilled }
  },
})

export const getDefaultSheet = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    return await ctx.db
      .query("a2e_bookSheets")
      .withIndex("by_workspace_system", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("systemKey", DEFAULT_BOOK_KEY),
      )
      .unique()
  },
})

export const getSheet = query({
  args: { sheetId: v.id("a2e_bookSheets") },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId)
    if (!sheet) return null
    await assertWorkspaceMember(ctx, sheet.workspaceId)
    return sheet
  },
})

export const createSheet = mutation({
  args: {
    workspaceId: v.string(),
    name: v.string(),
    type: v.optional(v.union(v.literal("grid"), v.literal("ledger"))),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.array(columnValidator)),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(ctx, args.workspaceId, "member")
    const now = Date.now()
    const id = await ctx.db.insert("a2e_bookSheets", {
      workspaceId: args.workspaceId,
      name: args.name,
      type: args.type,
      icon: args.icon,
      color: args.color,
      description: args.description,
      columns: args.columns ?? DEFAULT_COLUMNS.filter((c) => !c.managed),
      isTemplate: args.isTemplate,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await logActivity(ctx, {
      workspaceId: args.workspaceId,
      actorId: userId,
      action: "book.sheet_created",
      targetType: "book_sheet",
      targetId: id,
      metadata: { name: args.name },
    })
    return id
  },
})

export const updateSheet = mutation({
  args: {
    sheetId: v.id("a2e_bookSheets"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("grid"), v.literal("ledger"))),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    columns: v.optional(v.array(columnValidator)),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId)
    if (!sheet) throw new Error("Sheet not found")
    const { userId } = await assertWorkspaceMember(ctx, sheet.workspaceId, "member")

    const { sheetId, ...rest } = args as Record<string, any>
    const patch: Record<string, any> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue
      patch[key] = value
    }

    // The auto-journal keeps its managed columns: users may append their own,
    // never drop or retype the ones the engine writes.
    if (sheet.locked && Array.isArray(patch.columns)) {
      const managed = sheet.columns.filter((c) => c.managed)
      const extras = patch.columns.filter(
        (c: any) => !managed.some((m) => m.id === c.id) && c.id !== "comment",
      )
      const comment = sheet.columns.find((c) => c.id === "comment")
      patch.columns = [...managed, ...(comment ? [comment] : []), ...extras]
    }

    await ctx.db.patch(args.sheetId, patch)
    await logActivity(ctx, {
      workspaceId: sheet.workspaceId,
      actorId: userId,
      action: "book.sheet_updated",
      targetType: "book_sheet",
      targetId: args.sheetId,
    })
    return args.sheetId
  },
})

export const removeSheet = mutation({
  args: { sheetId: v.id("a2e_bookSheets") },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId)
    if (!sheet) throw new Error("Sheet not found")
    const { userId } = await assertWorkspaceMember(ctx, sheet.workspaceId, "member")
    if (sheet.isDefault || sheet.locked) {
      throw new Error(
        "Le journal automatique ne peut pas être supprimé : il est alimenté par vos recettes et dépenses.",
      )
    }
    const entries = await ctx.db
      .query("a2e_bookEntries")
      .withIndex("by_sheet", (q) => q.eq("sheetId", args.sheetId))
      .collect()
    for (const entry of entries) await ctx.db.delete(entry._id)
    const expenses = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_sheet", (q) => q.eq("sheetId", args.sheetId))
      .collect()
    for (const expense of expenses) await ctx.db.patch(expense._id, { sheetId: undefined })
    await ctx.db.delete(args.sheetId)
    await logActivity(ctx, {
      workspaceId: sheet.workspaceId,
      actorId: userId,
      action: "book.sheet_deleted",
      targetType: "book_sheet",
      targetId: args.sheetId,
    })
    return true
  },
})

export const listEntries = query({
  args: { sheetId: v.id("a2e_bookSheets") },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId)
    if (!sheet) return []
    await assertWorkspaceMember(ctx, sheet.workspaceId)
    const rows = await ctx.db
      .query("a2e_bookEntries")
      .withIndex("by_sheet", (q) => q.eq("sheetId", args.sheetId))
      .order("desc")
      .collect()
    return await Promise.all(rows.map((row) => decryptEntryCells(row)))
  },
})

export const createEntry = mutation({
  args: {
    sheetId: v.id("a2e_bookSheets"),
    cells: v.any(),
    linkedDocuments: v.optional(v.array(v.string())),
    linkedExpenses: v.optional(v.array(v.id("a2e_expenses"))),
    linkedInvoices: v.optional(v.array(v.id("a2e_invoices"))),
    linkedProjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const sheet = await ctx.db.get(args.sheetId)
    if (!sheet) throw new Error("Sheet not found")
    const { userId } = await assertWorkspaceMember(ctx, sheet.workspaceId, "member")
    const now = Date.now()
    const cells = await encryptCells(sheet.workspaceId, args.cells ?? {})
    const id = await ctx.db.insert("a2e_bookEntries", {
      workspaceId: sheet.workspaceId,
      sheetId: args.sheetId,
      cells,
      linkedDocuments: args.linkedDocuments ?? [],
      linkedExpenses: args.linkedExpenses ?? [],
      linkedInvoices: args.linkedInvoices ?? [],
      linkedProjectId: args.linkedProjectId,
      auto: false,
      sourceKind: "manual",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.patch(args.sheetId, { updatedAt: now })
    await logActivity(ctx, {
      workspaceId: sheet.workspaceId,
      actorId: userId,
      action: "book.entry_created",
      targetType: "book_entry",
      targetId: id,
    })
    return id
  },
})

export const updateEntry = mutation({
  args: {
    entryId: v.id("a2e_bookEntries"),
    cells: v.optional(v.any()),
    linkedDocuments: v.optional(v.array(v.string())),
    linkedExpenses: v.optional(v.array(v.id("a2e_expenses"))),
    linkedInvoices: v.optional(v.array(v.id("a2e_invoices"))),
    linkedProjectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    if (!entry) throw new Error("Entry not found")
    await assertWorkspaceMember(ctx, entry.workspaceId, "member")

    const { entryId, ...rest } = args as Record<string, any>
    const patch: Record<string, any> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue
      patch[key] = value
    }

    if (patch.cells) {
      let next = { ...(entry.cells ?? {}), ...patch.cells }
      // An auto row mirrors its source record: only free columns are editable.
      if (entry.auto) {
        next = { ...next }
        for (const key of MANAGED_CELLS) next[key] = (entry.cells ?? {})[key]
      }
      patch.cells = await encryptCells(entry.workspaceId, next)
    }

    await ctx.db.patch(args.entryId, patch)
    await ctx.db.patch(entry.sheetId, { updatedAt: Date.now() })
    return args.entryId
  },
})

export const removeEntry = mutation({
  args: { entryId: v.id("a2e_bookEntries") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId)
    if (!entry) throw new Error("Entry not found")
    await assertWorkspaceMember(ctx, entry.workspaceId, "member")
    if (entry.auto) {
      throw new Error(
        "Cette ligne est générée automatiquement : supprimez la recette ou la dépense correspondante.",
      )
    }
    await ctx.db.delete(args.entryId)
    await ctx.db.patch(entry.sheetId, { updatedAt: Date.now() })
    return true
  },
})

/** Encrypts the sensitive cell keys before storage (idempotent). */
async function encryptCells(
  workspaceId: string,
  cells: Record<string, any>,
): Promise<Record<string, any>> {
  const out = { ...cells }
  for (const key of ENCRYPTED_CELLS) {
    const value = out[key]
    if (typeof value === "string" && value && !value.startsWith("enc.v1.")) {
      out[key] = await encryptOptional(workspaceId, "a2e_bookEntries", key, value)
    }
  }
  return out
}
