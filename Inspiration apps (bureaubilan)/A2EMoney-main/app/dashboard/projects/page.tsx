"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
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
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import { Plus, FolderOpen, Trash2, Loader2, ClipboardList } from "@/components/iconsax"
import { toast } from "sonner"

export default function ProjectsPage() {
  const t = useTranslations("pages.projects")
  const tCommon = useTranslations("common")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"

  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")
  const create = useMutation(api.projects.create)
  const remove = useMutation(api.projects.remove)

  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [client, setClient] = React.useState("")
  const [budget, setBudget] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<"planning" | "active" | "on_hold" | "completed">("planning")
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const STATUS_COLORS: Record<string, string> = {
    planning: "bg-primary/10 text-primary",
    active: "bg-success/10 text-success",
    on_hold: "bg-warning/15 text-warning",
    completed: "bg-muted text-muted-foreground",
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!wsId) return
    try {
      setSaving(true)
      await create({
        workspaceId: wsId,
        name: name.trim(),
        client: client.trim() || "Internal",
        status,
        budget: budget ? parseFloat(budget) : undefined,
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate).getTime() : undefined,
        endDate: endDate ? new Date(endDate).getTime() : undefined,
      })
      toast.success(t("toasts.created"))
      setOpen(false)
      setName(""); setClient(""); setBudget(""); setDescription(""); setEndDate("")
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally { setSaving(false) }
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2 rounded-full shadow-sm"><Plus className="h-4 w-4" /> {t("new")}</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("new")}</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="space-y-4 px-1">
                  <div><Label>{tCommon("name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{tCommon("client")}</Label><Input value={client} onChange={(e) => setClient(e.target.value)} /></div>
                    <div><Label>{t("budget")} ({currency})</Label><Input type="number" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{t("startDate")}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div><Label>{t("endDate")}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                  </div>
                  <div><Label>{tCommon("status")}</Label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                      <option value="planning">{t("status.planning")}</option>
                      <option value="active">{t("status.active")}</option>
                      <option value="on_hold">{t("status.on_hold")}</option>
                      <option value="completed">{t("status.completed")}</option>
                    </select>
                  </div>
                  <div><Label>{tCommon("description")}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
                </DialogBody>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tCommon("cancel")}</Button>
                  <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("create")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {projects === undefined ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : projects.length === 0 ? (
          <GlassCard>
            <EmptyState icon={FolderOpen} title={t("empty.title")} description={t("empty.description")} action={{ onClick: () => setOpen(true), label: t("new") }} />
          </GlassCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, idx) => {
              const budgetUsage = p.budget ? Math.min(100, ((p.spent || 0) / p.budget) * 100) : 0
              return (
                <motion.div key={p._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * idx }}>
                  <GlassCard className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold">{p.name}</h3>
                        <p className="truncate text-xs text-muted-foreground">{p.client}</p>
                      </div>
                      <Badge variant="secondary" className={STATUS_COLORS[p.status]}>{t(`status.${p.status}`)}</Badge>
                    </div>
                    {p.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
                    {p.budget ? (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("budget")}</span>
                          <span className="font-medium">{formatCurrency(p.spent || 0, currency)} / {formatCurrency(p.budget, currency)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${budgetUsage}%` }} transition={{ duration: 0.6 }} className="h-full bg-[var(--brand-green)]" />
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between">
                      <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                        <Link href={`/dashboard/fiches?project=${p._id}`}><ClipboardList className="h-3.5 w-3.5" /> {t("openFiche")}</Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove({ projectId: p._id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {p.startDate && (
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(p.startDate)}</p>
                    )}
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
