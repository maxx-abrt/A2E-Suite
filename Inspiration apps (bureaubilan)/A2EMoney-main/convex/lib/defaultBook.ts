import type { Doc, Id } from "../_generated/dataModel"
import type { MCtx } from "./auth"
import { decryptField, encryptOptional } from "./crypto"

/**
 * THE DEFAULT BOOK ("Journal automatique").
 *
 * Every workspace gets exactly one system sheet, keyed `bilan.default.ledger`.
 * Each cash movement written anywhere in Bilan (an expense, an income, an
 * invoice payment, a granted subvention) writes / patches / removes ITS OWN row
 * in that sheet — including the core-drive justificatifs attached to it.
 *
 * Consequences by design:
 *  - a user never has to touch the book: at year end they export it and every
 *    line is already there, linked to its source record and its proofs;
 *  - the sheet is `locked` + `isDefault` → undeletable, managed columns are
 *    read-only, and the UI badges it;
 *  - only the `comment` column is user-writable on an auto row;
 *  - sensitive cells (`method`, `notes`) are stored ENCRYPTED, exactly like the
 *    source record, and decrypted on read for workspace members.
 */

export const DEFAULT_BOOK_KEY = "bilan.default.ledger"
export const DEFAULT_BOOK_NAME = "Journal automatique"

/** Cell keys written by the engine — read-only for humans. */
export const MANAGED_CELLS = [
  "date",
  "type",
  "label",
  "category",
  "amount",
  "currency",
  "method",
  "project",
  "proofs",
  "ref",
  "source",
] as const

/** Cell keys stored encrypted at rest inside `cells`. */
export const ENCRYPTED_CELLS = ["method", "notes"] as const

export const DEFAULT_COLUMNS = [
  { id: "date", name: "Date", type: "date", managed: true, width: 120 },
  {
    id: "type",
    name: "Type",
    type: "select",
    options: ["Recette", "Dépense"],
    managed: true,
    width: 110,
  },
  { id: "label", name: "Libellé", type: "text", managed: true, width: 260 },
  { id: "category", name: "Catégorie", type: "text", managed: true, width: 150 },
  { id: "amount", name: "Montant", type: "currency", managed: true, width: 130 },
  { id: "currency", name: "Devise", type: "text", managed: true, width: 90 },
  { id: "method", name: "Moyen de paiement", type: "text", managed: true, width: 160 },
  { id: "project", name: "Projet", type: "text", managed: true, width: 160 },
  { id: "proofs", name: "Justificatifs", type: "text", managed: true, width: 220 },
  { id: "ref", name: "Référence", type: "text", managed: true, width: 150 },
  { id: "comment", name: "Commentaire", type: "text", width: 200 },
]

/** Idempotent: returns the workspace's auto-journal, creating it on first use. */
export async function ensureDefaultSheet(
  ctx: MCtx,
  workspaceId: string,
  userId: string,
): Promise<Id<"a2e_bookSheets">> {
  const existing = await ctx.db
    .query("a2e_bookSheets")
    .withIndex("by_workspace_system", (q) =>
      q.eq("workspaceId", workspaceId).eq("systemKey", DEFAULT_BOOK_KEY),
    )
    .unique()
  if (existing) {
    // Self-heal: a sheet created by an older build may miss the new flags.
    if (!existing.isDefault || !existing.locked || existing.columns.length === 0) {
      await ctx.db.patch(existing._id, {
        isDefault: true,
        locked: true,
        columns: existing.columns.length ? existing.columns : DEFAULT_COLUMNS,
        updatedAt: Date.now(),
      })
    }
    return existing._id
  }

  const now = Date.now()
  return await ctx.db.insert("a2e_bookSheets", {
    workspaceId,
    name: DEFAULT_BOOK_NAME,
    icon: "Book1",
    color: "#16a34a",
    type: "ledger",
    columns: DEFAULT_COLUMNS,
    description:
      "Journal alimenté automatiquement par chaque recette et dépense de Bilan, justificatifs inclus. Exportable tel quel en fin d'exercice.",
    isDefault: true,
    locked: true,
    systemKey: DEFAULT_BOOK_KEY,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  })
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

async function projectName(ctx: MCtx, projectId?: Id<"projects">): Promise<string> {
  if (!projectId) return ""
  const project = await ctx.db.get(projectId)
  return project?.name ?? ""
}

/**
 * Upserts the auto row of one expense/income. Called after every write on
 * `a2e_expenses`; safe to call repeatedly (keyed by `sourceKind`+`sourceId`).
 */
export async function syncExpenseEntry(
  ctx: MCtx,
  expense: Doc<"a2e_expenses">,
): Promise<Id<"a2e_bookEntries">> {
  const sheetId = await ensureDefaultSheet(ctx, expense.workspaceId, expense.createdBy)
  const now = Date.now()
  const attachments = expense.attachments ?? []
  const ref = expense.linkedInvoice
    ? ((await ctx.db.get(expense.linkedInvoice))?.number ?? "")
    : `EXP-${String(expense._id).slice(-6).toUpperCase()}`

  // `paymentMethod` is stored encrypted on the expense; keep the ciphertext
  // shape consistent for the book row (encrypted under the book's own AAD).
  const clearMethod = await decryptField(
    expense.workspaceId,
    "a2e_expenses",
    "paymentMethod",
    expense.paymentMethod,
  )

  const cells: Record<string, unknown> = {
    date: isoDay(expense.date),
    type: expense.type === "income" ? "Recette" : "Dépense",
    label: expense.description,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency ?? "EUR",
    method: await encryptOptional(
      expense.workspaceId,
      "a2e_bookEntries",
      "method",
      clearMethod || "",
    ),
    project: await projectName(ctx, expense.projectId),
    proofs: attachments.map((a) => a.name).join(", "),
    ref,
    source: "expense",
  }

  const existing = await ctx.db
    .query("a2e_bookEntries")
    .withIndex("by_sheet_source", (q) =>
      q.eq("sheetId", sheetId).eq("sourceKind", "expense").eq("sourceId", String(expense._id)),
    )
    .unique()

  if (existing) {
    await ctx.db.patch(existing._id, {
      cells: { ...(existing.cells ?? {}), ...cells },
      attachments,
      linkedDocuments: expense.linkedDocuments ?? [],
      linkedExpenses: [expense._id],
      linkedProjectId: expense.projectId,
      updatedAt: now,
    })
    await ctx.db.patch(sheetId, { updatedAt: now })
    return existing._id
  }

  const entryId = await ctx.db.insert("a2e_bookEntries", {
    workspaceId: expense.workspaceId,
    sheetId,
    cells,
    attachments,
    linkedDocuments: expense.linkedDocuments ?? [],
    linkedExpenses: [expense._id],
    linkedInvoices: expense.linkedInvoice ? [expense.linkedInvoice] : [],
    linkedProjectId: expense.projectId,
    auto: true,
    sourceKind: "expense",
    sourceId: String(expense._id),
    createdBy: expense.createdBy,
    createdAt: now,
    updatedAt: now,
  })
  await ctx.db.patch(sheetId, { updatedAt: now })
  await ctx.db.patch(expense._id, { linkedBookEntries: [String(entryId)], sheetId })
  return entryId
}

/** Removes the auto row(s) of a source record (after the record is deleted). */
export async function dropAutoEntries(
  ctx: MCtx,
  sourceKind: string,
  sourceId: string,
): Promise<number> {
  const rows = await ctx.db
    .query("a2e_bookEntries")
    .withIndex("by_source", (q) => q.eq("sourceKind", sourceKind).eq("sourceId", sourceId))
    .collect()
  for (const row of rows) await ctx.db.delete(row._id)
  return rows.length
}

/** Decrypts the sensitive cells of one book row for a workspace member. */
export async function decryptEntryCells<T extends { workspaceId: string; cells: any }>(
  entry: T,
): Promise<T> {
  const cells = { ...(entry.cells ?? {}) }
  for (const key of ENCRYPTED_CELLS) {
    const value = cells[key]
    if (typeof value === "string" && value) {
      cells[key] = await decryptField(entry.workspaceId, "a2e_bookEntries", key, value)
    }
  }
  return { ...entry, cells }
}
