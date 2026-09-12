import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"
import { assertWorkspaceMember, logActivity } from "./lib/auth"
import { syncExpenseEntry } from "./lib/defaultBook"

/**
 * Bridges the A2E **core drive** (Backblaze B2) back into Bilan.
 *
 * The bytes never touch this deployment: `@a2e/core`'s `useUpload()` presigns
 * against core, PUTs straight to B2, and core owns the `drive_files` row with
 * `linkedTo: { app: "bilan", type, id }`. What Bilan keeps is the *reference*
 * (file id + display name/size) so that:
 *   - a ledger line can name its justificatif in an export, offline, with no
 *     cross-deployment read;
 *   - the auto-journal row is refreshed the moment a proof is added or removed.
 */

const refValidator = v.object({
  fileId: v.string(),
  name: v.string(),
  contentType: v.optional(v.string()),
  size: v.optional(v.number()),
})

type EntityType = "expense" | "invoice"

export const link = mutation({
  args: {
    entityType: v.union(v.literal("expense"), v.literal("invoice")),
    entityId: v.string(),
    file: refValidator,
  },
  handler: async (ctx, args) => {
    const kind = args.entityType as EntityType
    if (kind === "expense") {
      const expense = (await ctx.db.get(args.entityId as Id<"a2e_expenses">)) as Doc<"a2e_expenses"> | null
      if (!expense || !("amount" in expense)) throw new Error("Expense not found")
      const { userId } = await assertWorkspaceMember(ctx, expense.workspaceId, "member")
      const attachments = [
        ...(expense.attachments ?? []).filter((a) => a.fileId !== args.file.fileId),
        args.file,
      ]
      const linkedDocuments = Array.from(
        new Set([...(expense.linkedDocuments ?? []), args.file.fileId]),
      )
      await ctx.db.patch(expense._id, { attachments, linkedDocuments, updatedAt: Date.now() })
      const fresh = await ctx.db.get(expense._id)
      if (fresh) await syncExpenseEntry(ctx, fresh)
      await logActivity(ctx, {
        workspaceId: expense.workspaceId,
        actorId: userId,
        action: "attachment.linked",
        targetType: "expense",
        targetId: String(expense._id),
        metadata: { name: args.file.name },
      })
      return { attachments }
    }

    const invoice = (await ctx.db.get(args.entityId as Id<"a2e_invoices">)) as Doc<"a2e_invoices"> | null
    if (!invoice || !("number" in invoice)) throw new Error("Invoice not found")
    const { userId } = await assertWorkspaceMember(ctx, invoice.workspaceId, "member")
    const attachments = [
      ...(invoice.attachments ?? []).filter((a) => a.fileId !== args.file.fileId),
      args.file,
    ]
    const linkedDocuments = Array.from(
      new Set([...(invoice.linkedDocuments ?? []), args.file.fileId]),
    )
    await ctx.db.patch(invoice._id, { attachments, linkedDocuments, updatedAt: Date.now() })
    await logActivity(ctx, {
      workspaceId: invoice.workspaceId,
      actorId: userId,
      action: "attachment.linked",
      targetType: "invoice",
      targetId: String(invoice._id),
      metadata: { name: args.file.name },
    })
    return { attachments }
  },
})

export const unlink = mutation({
  args: {
    entityType: v.union(v.literal("expense"), v.literal("invoice")),
    entityId: v.string(),
    fileId: v.string(),
  },
  handler: async (ctx, args) => {
    const row: any = await ctx.db.get(args.entityId as any)
    if (!row) return { attachments: [] }
    const { userId } = await assertWorkspaceMember(ctx, row.workspaceId, "member")
    const attachments = (row.attachments ?? []).filter((a: any) => a.fileId !== args.fileId)
    const linkedDocuments = (row.linkedDocuments ?? []).filter((f: string) => f !== args.fileId)
    await ctx.db.patch(row._id, { attachments, linkedDocuments, updatedAt: Date.now() })
    if (args.entityType === "expense") {
      const fresh = await ctx.db.get(row._id)
      if (fresh) await syncExpenseEntry(ctx, fresh as any)
    }
    await logActivity(ctx, {
      workspaceId: row.workspaceId,
      actorId: userId,
      action: "attachment.unlinked",
      targetType: args.entityType,
      targetId: String(row._id),
    })
    return { attachments }
  },
})

/** Every proof referenced across the workspace — powers the Documents page. */
export const listForWorkspace = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    const expenses = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect()
    const invoices = await ctx.db
      .query("a2e_invoices")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect()
    const out: Array<{
      fileId: string
      name: string
      size?: number
      contentType?: string
      entityType: string
      entityId: string
      entityLabel: string
    }> = []
    for (const e of expenses)
      for (const a of e.attachments ?? [])
        out.push({ ...a, entityType: "expense", entityId: String(e._id), entityLabel: e.description })
    for (const i of invoices)
      for (const a of i.attachments ?? [])
        out.push({
          ...a,
          entityType: "invoice",
          entityId: String(i._id),
          entityLabel: `${i.number} — ${i.client}`,
        })
    return out
  },
})
