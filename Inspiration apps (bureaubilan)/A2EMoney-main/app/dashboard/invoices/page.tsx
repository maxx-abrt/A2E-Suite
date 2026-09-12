"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useWorkspace } from "@/lib/workspace-context"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import { AttachmentsField } from "@/components/attachments-field"
import { Plus, FileText, Trash2, Loader2, MoreHorizontal, CheckCircle2, Clock, AlertCircle, Send } from "@/components/iconsax"
import { toast } from "sonner"

const STATUS_VARIANT: Record<string, string> = {
  draft: "bg-muted text-foreground",
  sent: "bg-primary/10 text-primary",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground line-through",
}

function newItem() {
  return { id: Math.random().toString(36).slice(2), description: "", quantity: 1, unitPrice: 0 }
}

export default function InvoicesPage() {
  const t = useTranslations("pages.invoices")
  const tCommon = useTranslations("common")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"
  const searchParams = useSearchParams()

  const invoices = useQuery(api.a2e_invoices.list, wsId ? { workspaceId: wsId } : "skip")
  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")
  const create = useMutation(api.a2e_invoices.create)
  const update = useMutation(api.a2e_invoices.update)
  const remove = useMutation(api.a2e_invoices.remove)

  const [open, setOpen] = React.useState(false)
  const [client, setClient] = React.useState("")
  const [clientEmail, setClientEmail] = React.useState("")
  const [clientAddress, setClientAddress] = React.useState("")
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = React.useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0])
  const [items, setItems] = React.useState([newItem()])
  const [notes, setNotes] = React.useState("")
  const [projectId, setProjectId] = React.useState<string>("")
  const [taxRate, setTaxRate] = React.useState("0")
  const [savedId, setSavedId] = React.useState<Id<"a2e_invoices"> | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => { if (searchParams.get("new")) setOpen(true) }, [searchParams])

  const subtotal = items.reduce((a, b) => a + b.quantity * b.unitPrice, 0)
  const tax = subtotal * (parseFloat(taxRate) / 100 || 0)
  const total = subtotal + tax

  function resetForm() {
    setClient(""); setClientEmail(""); setClientAddress(""); setItems([newItem()]); setNotes(""); setProjectId(""); setTaxRate("0"); setSavedId(null)
  }
  function closeDialog() { setOpen(false); setTimeout(resetForm, 200) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!wsId) return
    try {
      setSaving(true)
      const id = await create({
        workspaceId: wsId,
        client: client.trim(), clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim() || undefined,
        items: items.filter((i) => i.description.trim()),
        issueDate: new Date(issueDate).getTime(),
        dueDate: new Date(dueDate).getTime(),
        notes: notes.trim() || undefined,
        taxRate: parseFloat(taxRate) || undefined,
        currency,
        projectId: projectId ? (projectId as Id<"projects">) : undefined,
      })
      setSavedId(id)
      toast.success(t("toasts.created"))
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally { setSaving(false) }
  }

  async function markStatus(id: Id<"a2e_invoices">, status: "draft" | "sent" | "paid" | "overdue" | "cancelled") {
    try {
      await update({ invoiceId: id, status, paidDate: status === "paid" ? Date.now() : undefined })
      toast.success(t("toasts.marked", { status: t(`status.${status}`) }))
    } catch (err: any) { toast.error(err?.message || t("toasts.failed")) }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => (o ? setOpen(o) : closeDialog())}>
            <DialogTrigger asChild><Button className="gap-2 rounded-full shadow-sm"><Plus className="h-4 w-4" /> {t("new")}</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{savedId ? t("attach.title") : t("new")}</DialogTitle></DialogHeader>
              {!savedId ? (
                <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                  <DialogBody className="space-y-4 px-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>{tCommon("client")}</Label><Input value={client} onChange={(e) => setClient(e.target.value)} required /></div>
                      <div><Label>{t("clientEmail")}</Label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required /></div>
                    </div>
                    <div><Label>{t("clientAddress")}</Label><Textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={2} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>{t("issueDate")}</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required /></div>
                      <div><Label>{t("dueDate")}</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("lineItems")}</Label>
                      {items.map((it, idx) => (
                        <div key={it.id} className="grid grid-cols-[1fr_80px_100px_auto] items-end gap-2">
                          <Input placeholder={tCommon("description")} value={it.description} onChange={(e) => { const copy = [...items]; copy[idx] = { ...it, description: e.target.value }; setItems(copy) }} />
                          <Input type="number" min="0" step="1" value={it.quantity} onChange={(e) => { const copy = [...items]; copy[idx] = { ...it, quantity: parseFloat(e.target.value || "0") }; setItems(copy) }} />
                          <Input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e) => { const copy = [...items]; copy[idx] = { ...it, unitPrice: parseFloat(e.target.value || "0") }; setItems(copy) }} />
                          <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== idx))} disabled={items.length === 1}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, newItem()])}><Plus className="mr-1 h-3.5 w-3.5" /> {t("addLine")}</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>{t("taxRate")}</Label><Input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} /></div>
                      {(projects ?? []).length > 0 && (
                        <div><Label>{tCommon("project")}</Label>
                          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                            <option value="">—</option>
                            {(projects ?? []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div><Label>{tCommon("notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("subtotal")}</span><span>{formatCurrency(subtotal, currency)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{t("tax")}</span><span>{formatCurrency(tax, currency)}</span></div>
                      <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>{t("total")}</span><span>{formatCurrency(total, currency)}</span></div>
                    </div>
                  </DialogBody>
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog}>{tCommon("cancel")}</Button>
                    <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("save")}</Button>
                  </DialogFooter>
                </form>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <DialogBody className="space-y-4 px-1">
                    <p className="text-sm text-muted-foreground">{t("attach.description")}</p>
                    <AttachmentsField linkedTo={{ type: "invoice", id: savedId }} documentType="invoice" />
                  </DialogBody>
                  <DialogFooter className="pt-4"><Button onClick={closeDialog}>{tCommon("close")}</Button></DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <GlassCard>
          {invoices === undefined ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={FileText} title={t("empty.title")} description={t("empty.description")} action={{ onClick: () => setOpen(true), label: t("new") }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">{t("number")}</th>
                    <th className="px-5 py-3">{tCommon("client")}</th>
                    <th className="px-5 py-3">{t("issue")}</th>
                    <th className="px-5 py-3">{t("due")}</th>
                    <th className="px-5 py-3">{tCommon("status")}</th>
                    <th className="px-5 py-3 text-right">{tCommon("amount")}</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv) => {
                    const totalAmt = inv.items.reduce((a, b) => a + b.quantity * b.unitPrice, 0)
                    return (
                      <tr key={inv._id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-numeric font-medium">{inv.number}</td>
                        <td className="px-5 py-3">{inv.client}</td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.issueDate)}</td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                        <td className="px-5 py-3">
                          <Badge variant="secondary" className={STATUS_VARIANT[inv.status]}>{t(`status.${inv.status}`)}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-numeric font-medium">{formatCurrency(totalAmt, inv.currency)}</td>
                        <td className="px-5 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => markStatus(inv._id, "sent")}><Send className="mr-2 h-4 w-4" /> {t("actions.markSent")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markStatus(inv._id, "paid")}><CheckCircle2 className="mr-2 h-4 w-4" /> {t("actions.markPaid")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markStatus(inv._id, "overdue")}><AlertCircle className="mr-2 h-4 w-4" /> {t("actions.markOverdue")}</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => markStatus(inv._id, "draft")}><Clock className="mr-2 h-4 w-4" /> {t("actions.backToDraft")}</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => remove({ invoiceId: inv._id })}><Trash2 className="mr-2 h-4 w-4" /> {t("actions.delete")}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
