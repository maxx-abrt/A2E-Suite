"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import {
  QuotaExceededError,
  useContactMutations,
  useContactSearch,
  useContacts,
  useQuota,
  useWorkspace,
} from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import { Plus, People, Trash2, Loader2, ReceiptText, Wallet3, Search, ShieldTick, Edit } from "@/components/iconsax"
import { toast } from "sonner"

/**
 * Clients / donors / partners — backed by the **shared A2E People directory**
 * (core `contacts`). A donor created here is the same record Bureau's CRM or
 * Forms will read; invoices reference it by core contact id.
 */
export default function ClientsPage() {
  const t = useTranslations("pages.clients")
  const tCommon = useTranslations("common")
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const currency = activeWorkspace?.currency ?? "EUR"

  const contacts = useContacts(activeWorkspaceId)
  const [query, setQuery] = React.useState("")
  const hits = useContactSearch(activeWorkspaceId, query)
  const quota = useQuota(activeWorkspaceId, "maxContacts")
  const invoices = useQuery(
    api.a2e_invoices.list,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip",
  )
  const { create, update, remove } = useContactMutations()

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    address: "",
    siret: "",
    phone: "",
    company: "",
    notes: "",
  })
  const [saving, setSaving] = React.useState(false)

  const list = query.trim().length >= 2 ? hits : contacts

  const stats = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number; paid: number }>()
    for (const inv of invoices ?? []) {
      const key = inv.linkedClientId
      if (!key) continue
      const current = map.get(key) ?? { count: 0, total: 0, paid: 0 }
      current.count++
      const total = inv.items.reduce((a, b) => a + b.quantity * b.unitPrice, 0)
      current.total += total
      if (inv.status === "paid") current.paid += total
      map.set(key, current)
    }
    return map
  }, [invoices])

  function reset() {
    setForm({ name: "", email: "", address: "", siret: "", phone: "", company: "", notes: "" })
    setEditing(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId || !form.name.trim()) return
    try {
      setSaving(true)
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        siret: form.siret.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }
      if (editing) {
        await update({ contactId: editing, ...payload })
        toast.success(t("toasts.updated"))
      } else {
        // Deduplicate on email before creating (shared directory hygiene).
        const duplicate = (contacts ?? []).find(
          (c) => payload.email && c.email?.toLowerCase() === payload.email.toLowerCase(),
        )
        if (duplicate) {
          toast.error(t("toasts.duplicate", { name: duplicate.name }))
          return
        }
        await create({ workspaceId: activeWorkspaceId, sourceApp: "bilan", ...payload })
        toast.success(t("toasts.created"))
      }
      setOpen(false)
      reset()
    } catch (err: any) {
      if (err instanceof QuotaExceededError) toast.error(t("toasts.quota", { limit: err.limit }))
      else toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Dialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (!next) reset()
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-full shadow-sm" data-testid="new-client-btn">
                <Plus className="h-4 w-4" /> {t("new")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editing ? t("edit") : t("new")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="space-y-5 px-1">
                  <div>
                    <Label>{tCommon("name")}</Label>
                    <Input
                      data-testid="client-name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        data-testid="client-email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("phone")}</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>{t("address")}</Label>
                    <Textarea
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SIRET</Label>
                      <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
                    </div>
                    <div>
                      <Label>{t("company")}</Label>
                      <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>{tCommon("notes")}</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t("sharedNotice")}</p>
                </DialogBody>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={saving} data-testid="save-client">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              data-testid="client-search"
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldTick className="h-3.5 w-3.5 text-success" />
            {t("quota", { used: contacts?.length ?? 0, limit: quota.limit < 0 ? "∞" : quota.limit })}
          </p>
        </div>

        {list === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={People}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ onClick: () => setOpen(true), label: t("new") }}
            />
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="clients-grid">
            {list.map((c, idx) => {
              const s = stats.get(c._id)
              return (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(0.3, 0.03 * idx) }}
                >
                  <GlassCard className="group p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{c.name}</h3>
                        {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.siret && (
                            <Badge variant="outline" className="text-[10px]">
                              SIRET {c.siret}
                            </Badge>
                          )}
                          {c.sourceApp && c.sourceApp !== "bilan" && (
                            <Badge variant="secondary" className="text-[10px]">
                              {c.sourceApp}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditing(c._id)
                            setForm({
                              name: c.name,
                              email: c.email ?? "",
                              address: c.address ?? "",
                              siret: c.siret ?? "",
                              phone: c.phone ?? "",
                              company: c.company ?? "",
                              notes: c.notes ?? "",
                            })
                            setOpen(true)
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={async () => {
                            if (!confirm(t("confirmDelete"))) return
                            await remove({ contactId: c._id })
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {s && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md bg-muted/40 p-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <ReceiptText className="h-3 w-3" /> {t("invoices")}
                          </div>
                          <p className="mt-1 font-semibold">{s.count}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 p-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Wallet3 className="h-3 w-3" /> {t("totalPaid")}
                          </div>
                          <p className="mt-1 font-semibold">{formatCurrency(s.paid, currency)}</p>
                        </div>
                      </div>
                    )}
                    {c.address && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.address}</p>}
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
