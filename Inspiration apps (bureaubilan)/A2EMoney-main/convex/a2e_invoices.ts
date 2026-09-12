import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertWorkspaceMember, logActivity, notifyWorkspaceMembers } from "./lib/auth"
import { api } from "./_generated/api"
import { decryptFields, decryptMany, encryptOptional } from "./lib/crypto"

/**
 * Invoices. Client identity fields are ENCRYPTED AT REST (AES-256-GCM, per
 * workspace, context-bound) and decrypted only for members of the workspace.
 * `linkedClientId` points at a core `contacts._id` — the suite People directory.
 */
const ENCRYPTED = ["clientEmail", "clientAddress", "notes"] as const

function nextInvoiceNumber(existing: string[]): string {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${prefix}${String(max + 1).padStart(4, "0")}`
}

const itemValidator = v.object({
  id: v.string(),
  description: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
})

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("cancelled"),
)

export const list = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId)
    const rows = await ctx.db
      .query("a2e_invoices")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .collect()
    return await decryptMany(args.workspaceId, "a2e_invoices", rows, ENCRYPTED)
  },
})

export const get = query({
  args: { invoiceId: v.id("a2e_invoices") },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId)
    if (!inv) return null
    await assertWorkspaceMember(ctx, inv.workspaceId)
    return await decryptFields(inv.workspaceId, "a2e_invoices", inv, ENCRYPTED)
  },
})

export const create = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    client: v.string(),
    /** core `contacts._id` */
    linkedClientId: v.optional(v.string()),
    clientEmail: v.string(),
    clientAddress: v.optional(v.string()),
    items: v.array(itemValidator),
    status: v.optional(statusValidator),
    issueDate: v.number(),
    dueDate: v.number(),
    notes: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(ctx, args.workspaceId, "member")
    const all = await ctx.db
      .query("a2e_invoices")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect()
    const number = nextInvoiceNumber(all.map((i) => i.number))
    const now = Date.now()
    const id = await ctx.db.insert("a2e_invoices", {
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      number,
      client: args.client,
      linkedClientId: args.linkedClientId,
      clientEmail:
        (await encryptOptional(args.workspaceId, "a2e_invoices", "clientEmail", args.clientEmail)) ?? "",
      clientAddress: await encryptOptional(
        args.workspaceId,
        "a2e_invoices",
        "clientAddress",
        args.clientAddress,
      ),
      items: args.items,
      status: args.status ?? "draft",
      issueDate: args.issueDate,
      dueDate: args.dueDate,
      notes: await encryptOptional(args.workspaceId, "a2e_invoices", "notes", args.notes),
      linkedDocuments: [],
      linkedBookEntries: [],
      taxRate: args.taxRate,
      currency: args.currency ?? "EUR",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await logActivity(ctx, {
      workspaceId: args.workspaceId,
      actorId: userId,
      action: "invoice.created",
      targetType: "invoice",
      targetId: id,
      metadata: { number, client: args.client },
    })
    return id
  },
})

export const update = mutation({
  args: {
    invoiceId: v.id("a2e_invoices"),
    projectId: v.optional(v.id("projects")),
    client: v.optional(v.string()),
    linkedClientId: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    clientAddress: v.optional(v.string()),
    items: v.optional(v.array(itemValidator)),
    status: v.optional(statusValidator),
    issueDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    paidDate: v.optional(v.number()),
    paidMethod: v.optional(v.string()),
    notes: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    currency: v.optional(v.string()),
    linkedDocuments: v.optional(v.array(v.string())),
    linkedBookEntries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId)
    if (!inv) throw new Error("Invoice not found")
    const { userId } = await assertWorkspaceMember(ctx, inv.workspaceId, "member")
    const { invoiceId, paidMethod, ...rest } = args as Record<string, any>
    const patch: Record<string, any> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined) continue
      patch[key] = (ENCRYPTED as readonly string[]).includes(key)
        ? await encryptOptional(inv.workspaceId, "a2e_invoices", key, value as string)
        : value
    }
    const prevStatus = inv.status
    await ctx.db.patch(args.invoiceId, patch)
    await logActivity(ctx, {
      workspaceId: inv.workspaceId,
      actorId: userId,
      action: "invoice.updated",
      targetType: "invoice",
      targetId: args.invoiceId,
    })

    if (args.status === "paid" && prevStatus !== "paid") {
      await notifyWorkspaceMembers(ctx, {
        workspaceId: inv.workspaceId,
        type: "invoice_paid",
        title: "Facture encaissée",
        message: `La facture ${inv.number} (${inv.client}) est marquée comme payée.`,
        link: "/dashboard/invoices",
      })
      const total = inv.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)
      await ctx.runMutation(api.a2e_expenses.create, {
        workspaceId: inv.workspaceId,
        projectId: inv.projectId,
        description: `Paiement facture ${inv.number} — ${inv.client}`,
        amount: total,
        category: "Other",
        date: args.paidDate ?? Date.now(),
        paymentMethod: paidMethod ?? "Bank transfer",
        type: "income",
        currency: inv.currency,
        linkedInvoice: args.invoiceId,
      })
    }
    return args.invoiceId
  },
})

export const remove = mutation({
  args: { invoiceId: v.id("a2e_invoices") },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invoiceId)
    if (!inv) throw new Error("Invoice not found")
    const { userId } = await assertWorkspaceMember(ctx, inv.workspaceId, "member")
    await ctx.db.delete(args.invoiceId)
    await logActivity(ctx, {
      workspaceId: inv.workspaceId,
      actorId: userId,
      action: "invoice.deleted",
      targetType: "invoice",
      targetId: args.invoiceId,
    })
    return true
  },
})
