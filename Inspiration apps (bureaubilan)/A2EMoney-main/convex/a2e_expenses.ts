import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertWorkspaceMember, logActivity } from "./lib/auth";
import { decryptFields, decryptMany, encryptOptional } from "./lib/crypto";
import { dropAutoEntries, syncExpenseEntry } from "./lib/defaultBook";

/** Free-text + payment details are encrypted at rest (AES-256-GCM, per workspace). */
const ENCRYPTED = ["notes", "paymentMethod"] as const;
import { api } from "./_generated/api";

export const list = query({
  args: { workspaceId: v.string() },
  handler: async (ctx, args) => {
    await assertWorkspaceMember(ctx, args.workspaceId);
    const rows = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_workspace_date", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .order("desc")
      .collect();
    return await decryptMany(args.workspaceId, "a2e_expenses", rows, ENCRYPTED);
  },
});

export const get = query({
  args: { expenseId: v.id("a2e_expenses") },
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.expenseId);
    if (!e) return null;
    await assertWorkspaceMember(ctx, e.workspaceId);
    return await decryptFields(e.workspaceId, "a2e_expenses", e, ENCRYPTED);
  },
});

export const create = mutation({
  args: {
    workspaceId: v.string(),
    projectId: v.optional(v.id("projects")),
    sheetId: v.optional(v.id("a2e_bookSheets")),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    date: v.number(),
    paymentMethod: v.string(),
    type: v.union(v.literal("expense"), v.literal("income")),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    recurringFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly"),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    linkedInvoice: v.optional(v.id("a2e_invoices")),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertWorkspaceMember(
      ctx,
      args.workspaceId,
      "member",
    );
    const now = Date.now();
    const id = await ctx.db.insert("a2e_expenses", {
      workspaceId: args.workspaceId,
      projectId: args.projectId,
      sheetId: args.sheetId,
      description: args.description,
      amount: args.amount,
      category: args.category,
      date: args.date,
      paymentMethod:
        (await encryptOptional(args.workspaceId, "a2e_expenses", "paymentMethod", args.paymentMethod)) ??
        "",
      type: args.type,
      notes: await encryptOptional(args.workspaceId, "a2e_expenses", "notes", args.notes),
      linkedDocuments: [],
      linkedInvoice: args.linkedInvoice,
      linkedBookEntries: [],
      isRecurring: args.isRecurring,
      recurringFrequency: args.recurringFrequency,
      tags: args.tags ?? [],
      currency: args.currency ?? "EUR",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
    await logActivity(ctx, {
      workspaceId: args.workspaceId,
      actorId: userId,
      action: args.type === "income" ? "income.created" : "expense.created",
      targetType: "expense",
      targetId: id,
      metadata: { amount: args.amount, category: args.category },
    });
    // DEFAULT BOOK: the movement writes its own line in the workspace journal.
    const created = await ctx.db.get(id);
    if (created) await syncExpenseEntry(ctx, created);
    // Auto-recalc project spent
    if (args.projectId) {
      await ctx.runMutation(api.projects.recalcSpend, { projectId: args.projectId });
    }
    // Budget alert check
    if (args.type === "expense") {
      await ctx.runMutation(api.a2e_budgets.checkAlerts, {
        workspaceId: args.workspaceId,
        category: args.category,
      });
    }
    return id;
  },
});

export const update = mutation({
  args: {
    expenseId: v.id("a2e_expenses"),
    projectId: v.optional(v.id("projects")),
    sheetId: v.optional(v.id("a2e_bookSheets")),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    category: v.optional(v.string()),
    date: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    type: v.optional(v.union(v.literal("expense"), v.literal("income"))),
    notes: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    recurringFrequency: v.optional(
      v.union(
        v.literal("weekly"),
        v.literal("monthly"),
        v.literal("yearly"),
      ),
    ),
    tags: v.optional(v.array(v.string())),
    currency: v.optional(v.string()),
    linkedInvoice: v.optional(v.id("a2e_invoices")),
    linkedDocuments: v.optional(v.array(v.string())),
    linkedBookEntries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.expenseId);
    if (!e) throw new Error("Expense not found");
    const { userId } = await assertWorkspaceMember(
      ctx,
      e.workspaceId,
      "member",
    );
    const { expenseId, ...rest } = args as any;
    const patch: any = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(rest)) {
      if (val === undefined) continue;
      patch[k] = (ENCRYPTED as readonly string[]).includes(k)
        ? await encryptOptional(e.workspaceId, "a2e_expenses", k, val as string)
        : val;
    }
    await ctx.db.patch(args.expenseId, patch);
    await logActivity(ctx, {
      workspaceId: e.workspaceId,
      actorId: userId,
      action: "expense.updated",
      targetType: "expense",
      targetId: args.expenseId,
    });
    // DEFAULT BOOK: keep the journal line in lockstep with the movement.
    const updated = await ctx.db.get(args.expenseId);
    if (updated) await syncExpenseEntry(ctx, updated);
    // Recalc old project if changed
    if (args.projectId !== undefined && args.projectId !== e.projectId) {
      if (e.projectId) await ctx.runMutation(api.projects.recalcSpend, { projectId: e.projectId });
      if (args.projectId) await ctx.runMutation(api.projects.recalcSpend, { projectId: args.projectId });
    } else if (e.projectId && (args.amount !== undefined || args.type !== undefined)) {
      await ctx.runMutation(api.projects.recalcSpend, { projectId: e.projectId });
    }
    // Budget alert check
    const category = args.category ?? e.category;
    const type = args.type ?? e.type;
    if (type === "expense") {
      await ctx.runMutation(api.a2e_budgets.checkAlerts, {
        workspaceId: e.workspaceId,
        category,
      });
    }
    return args.expenseId;
  },
});

export const listBySheet = query({
  args: { sheetId: v.id("a2e_bookSheets") },
  handler: async (ctx, args) => {
    const s = await ctx.db.get(args.sheetId);
    if (!s) return [];
    await assertWorkspaceMember(ctx, s.workspaceId);
    const exps = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_sheet", (q) => q.eq("sheetId", args.sheetId))
      .order("desc")
      .collect();
    return await decryptMany(s.workspaceId, "a2e_expenses", exps, ENCRYPTED);
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];
    await assertWorkspaceMember(ctx, project.workspaceId);
    const rows = await ctx.db
      .query("a2e_expenses")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
    return await decryptMany(project.workspaceId, "a2e_expenses", rows, ENCRYPTED);
  },
});

export const remove = mutation({
  args: { expenseId: v.id("a2e_expenses") },
  handler: async (ctx, args) => {
    const e = await ctx.db.get(args.expenseId);
    if (!e) throw new Error("Expense not found");
    const { userId } = await assertWorkspaceMember(
      ctx,
      e.workspaceId,
      "member",
    );
    await ctx.db.delete(args.expenseId);
    // DEFAULT BOOK: the auto line disappears with its source movement.
    await dropAutoEntries(ctx, "expense", String(args.expenseId));
    await logActivity(ctx, {
      workspaceId: e.workspaceId,
      actorId: userId,
      action: "expense.deleted",
      targetType: "expense",
      targetId: args.expenseId,
    });
    if (e.projectId) {
      await ctx.runMutation(api.projects.recalcSpend, { projectId: e.projectId });
    }
    if (e.type === "expense") {
      await ctx.runMutation(api.a2e_budgets.checkAlerts, {
        workspaceId: e.workspaceId,
        category: e.category,
      });
    }
    return true;
  },
});
