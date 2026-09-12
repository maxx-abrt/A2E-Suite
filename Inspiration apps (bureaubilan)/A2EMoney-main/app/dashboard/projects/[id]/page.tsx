"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useLinkedFiles, useTaskMutations, useTaskStatuses, useTasks, useWorkspace } from "@a2e/core"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GlassCard } from "@/components/glass-card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { AttachmentsField } from "@/components/attachments-field"
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Loader2,
  Trash2,
  ClipboardList,
  ClipboardTick,
  FileText,
  HardDrive,
  NoteText,
  Receipt,
  TickCircle,
} from "@/components/iconsax"
import { toast } from "sonner"
import { CATEGORIES, CATEGORY_I18N } from "@/lib/options"

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-primary/10 text-primary",
  active: "bg-success/10 text-success",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-muted text-muted-foreground",
}

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#10b981", "#06b6d4"]

export default function ProjectHubPage() {
  const t = useTranslations("pages.projects")
  const tCommon = useTranslations("common")
  const params = useParams<{ id: string }>()
  const projectId = params?.id as Id<"projects">
  const { activeWorkspace } = useWorkspace()
  const currency = activeWorkspace?.currency ?? "EUR"

  const project = useQuery(api.projects.get, projectId ? { projectId } : "skip")
  const expenses = useQuery(api.a2e_expenses.listByProject, projectId ? { projectId } : "skip")
  const fiches = useQuery(api.a2e_fiches.list, activeWorkspace?._id ? { workspaceId: activeWorkspace._id, projectId } : "skip")
  const docs = useLinkedFiles(
    activeWorkspace?._id,
    projectId ? { app: "bilan", type: "project", id: projectId } : null,
  )
  const allTasks = useTasks(activeWorkspace?._id)
  const taskStatuses = useTaskStatuses(activeWorkspace?._id)
  const { create: createTask, setStatus: setTaskStatus, remove: removeTask } = useTaskMutations()
  const tasks = React.useMemo(
    () => (allTasks ?? []).filter((task) => task.linkedTo?.type === "project" && task.linkedTo?.id === projectId),
    [allTasks, projectId],
  )
  const [newTask, setNewTask] = React.useState("")
  const doneKeys = React.useMemo(
    () => new Set((taskStatuses ?? []).filter((s) => s.isDone).map((s) => s.key)),
    [taskStatuses],
  )
  const grantReports = useQuery(api.a2e_grantReports.listByProject, projectId ? { projectId } : "skip")

  const updateProject = useMutation(api.projects.update)
  const createExpense = useMutation(api.a2e_expenses.create)

  const [editing, setEditing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Inline edit state
  const [editName, setEditName] = React.useState("")
  const [editClient, setEditClient] = React.useState("")
  const [editBudget, setEditBudget] = React.useState("")
  const [editStatus, setEditStatus] = React.useState<"planning" | "active" | "on_hold" | "completed">("planning")
  const [editColor, setEditColor] = React.useState(COLORS[0])
  const [editDescription, setEditDescription] = React.useState("")

  React.useEffect(() => {
    if (project) {
      setEditName(project.name)
      setEditClient(project.client)
      setEditBudget(project.budget ? String(project.budget) : "")
      setEditStatus(project.status)
      setEditColor(project.color || COLORS[0])
      setEditDescription(project.description || "")
    }
  }, [project?._id])

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault()
    if (!project) return
    try {
      setSaving(true)
      await updateProject({
        projectId,
        name: editName.trim(),
        client: editClient.trim(),
        budget: editBudget ? parseFloat(editBudget) : undefined,
        status: editStatus,
        color: editColor,
        description: editDescription.trim() || undefined,
      })
      setEditing(false)
      toast.success(t("toasts.updated"))
    } catch (err: any) {
      toast.error(err?.message || tCommon("errorOccurred"))
    } finally {
      setSaving(false)
    }
  }

  // Quick-add expense
  const [showAddExpense, setShowAddExpense] = React.useState(false)
  const [expDesc, setExpDesc] = React.useState("")
  const [expAmount, setExpAmount] = React.useState("")
  const [expType, setExpType] = React.useState<"expense" | "income">("expense")
  const [expCategory, setExpCategory] = React.useState("Other")

  // Loading timeout to prevent infinite spinner when backend is unreachable
  const [loadTimedOut, setLoadTimedOut] = React.useState(false)
  React.useEffect(() => {
    if (project !== undefined) { setLoadTimedOut(false); return }
    const t = setTimeout(() => setLoadTimedOut(true), 8000)
    return () => clearTimeout(t)
  }, [project])

  async function handleQuickAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspace?._id || !projectId) return
    try {
      await createExpense({
        workspaceId: activeWorkspace._id,
        projectId,
        description: expDesc.trim(),
        amount: parseFloat(expAmount),
        category: expCategory,
        date: Date.now(),
        paymentMethod: "Card",
        type: expType,
        currency,
      })
      setExpDesc(""); setExpAmount(""); setExpType("expense"); setExpCategory("Other")
      setShowAddExpense(false)
      toast.success(expType === "income" ? t("toasts.addedIncome") : t("toasts.addedExpense"))
    } catch (err: any) {
      toast.error(err?.message || tCommon("errorOccurred"))
    }
  }

  if (!project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        {loadTimedOut ? (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{tCommon("errorOccurred")}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  const budgetUsage = project.budget ? Math.min(100, ((project.spent || 0) / project.budget) * 100) : 0
  const totalIncome = (expenses ?? []).filter((e) => e.type === "income").reduce((a, b) => a + b.amount, 0)
  const totalExpense = (expenses ?? []).filter((e) => e.type === "expense").reduce((a, b) => a + b.amount, 0)

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumbs
          crumbs={[
            { label: "Projects", href: "/dashboard/projects" },
            { label: project.name },
          ]}
        />
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
              <Link href="/dashboard/projects"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="h-10 w-1.5 rounded-full" style={{ background: project.color || "#ccc" }} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground">{project.client}</p>
            </div>
            <Badge variant="secondary" className={STATUS_COLORS[project.status]}>{t(`status.${project.status}`)}</Badge>
          </div>

          {project.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
          )}

          {project.startDate && (
            <p className="text-xs text-muted-foreground">
              {formatDate(project.startDate)} {project.endDate ? `→ ${formatDate(project.endDate)}` : ""}
            </p>
          )}
        </div>

        {/* Budget + Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {project.budget ? (
            <GlassCard className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("budget")}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-numeric text-2xl font-semibold">{formatCurrency(project.spent || 0, currency)}</span>
                <span className="text-sm text-muted-foreground">/ {formatCurrency(project.budget, currency)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div initial={{ width: 0 }} animate={{ width: `${budgetUsage}%` }} transition={{ duration: 0.6 }} className="h-full bg-[var(--brand-green)]" />
              </div>
            </GlassCard>
          ) : null}
          <GlassCard className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("stats.income")}</p>
            <p className="mt-2 font-numeric text-2xl font-semibold text-primary">{formatCurrency(totalIncome, currency)}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("stats.expenses")}</p>
            <p className="mt-2 font-numeric text-2xl font-semibold text-foreground">{formatCurrency(totalExpense, currency)}</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("stats.net")}</p>
            <p className={`mt-2 font-numeric text-2xl font-semibold ${totalIncome - totalExpense >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(totalIncome - totalExpense, currency)}
            </p>
          </GlassCard>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions">
          <TabsList className="rounded-lg border border-border bg-card">
            <TabsTrigger value="transactions" className="gap-1"><Receipt className="h-3.5 w-3.5" /> {t("tabs.transactions")}</TabsTrigger>
            <TabsTrigger value="fiches" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> {t("tabs.fiches")}</TabsTrigger>
            <TabsTrigger value="cerfa" className="gap-1"><NoteText className="h-3.5 w-3.5" /> CERFA</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1"><ClipboardTick className="h-3.5 w-3.5" /> {t("tabs.tasks")}</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1"><HardDrive className="h-3.5 w-3.5" /> {t("tabs.documents")}</TabsTrigger>
            <TabsTrigger value="details" className="gap-1"><FileText className="h-3.5 w-3.5" /> {t("tabs.details")}</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("tabs.transactions")}</h2>
              <Button size="sm" className="gap-1 rounded-full" onClick={() => setShowAddExpense(true)}>
                <Plus className="h-3.5 w-3.5" /> {tCommon("add")}
              </Button>
            </div>

            {showAddExpense && (
              <GlassCard className="p-4">
                <form onSubmit={handleQuickAddExpense} className="flex flex-wrap items-end gap-3">
                  <div className="flex gap-1">
                    {(["expense", "income"] as const).map((opt) => (
                      <button key={opt} type="button" onClick={() => setExpType(opt)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${expType === opt ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>
                        {tCommon(opt)}
                      </button>
                    ))}
                  </div>
                  <Input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder={t("quickAdd.descriptionPlaceholder")} className="h-8 text-sm w-64" required />
                  <Input type="number" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder={t("quickAdd.amountPlaceholder")} className="h-8 text-sm w-32 font-numeric" required />
                  <Select value={expCategory} onValueChange={setExpCategory}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{tCommon(`categories.${CATEGORY_I18N[c]}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm">{t("quickAdd.save")}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddExpense(false)}>{t("quickAdd.cancel")}</Button>
                </form>
              </GlassCard>
            )}

            <GlassCard>
              {(expenses ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty.transactions")}</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {(expenses ?? []).map((e) => (
                    <li key={e._id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/20">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${e.type === "income" ? "bg-accent/10 text-primary" : "bg-muted"}`}>
                          {e.type === "income" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(e.date)} · {e.category} · {e.paymentMethod}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 font-numeric text-sm font-medium ${e.type === "income" ? "text-primary" : "text-foreground"}`}>
                        {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount, e.currency ?? currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="fiches" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("tabs.fiches")}</h2>
              <Button asChild size="sm" className="gap-1 rounded-full">
                <Link href={`/dashboard/fiches?project=${projectId}`}><Plus className="h-3.5 w-3.5" /> {t("tabs.fiches")}</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(fiches ?? []).length === 0 ? (
                <GlassCard className="p-5">
                  <p className="text-sm text-muted-foreground">{t("empty.fiches")}</p>
                </GlassCard>
              ) : (
                (fiches ?? []).map((f) => (
                  <Link key={f._id} href={`/dashboard/fiches/${f._id}`}>
                    <GlassCard className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <h3 className="text-base font-semibold hover:underline">{f.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{f.template} · {formatDate(f.updatedAt)}</p>
                    </GlassCard>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="cerfa" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">CERFA 15059</h2>
              <Button asChild size="sm" className="gap-1 rounded-full">
                <Link href={`/dashboard/projects/${projectId}/cerfa`}><Plus className="h-3.5 w-3.5" /> CERFA</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(grantReports ?? []).length === 0 ? (
                <GlassCard className="p-5">
                  <p className="text-sm text-muted-foreground">Aucun compte-rendu CERFA pour ce projet.</p>
                </GlassCard>
              ) : (
                (grantReports ?? []).map((r) => (
                  <Link key={r._id} href={`/dashboard/projects/${projectId}/cerfa/${r._id}`}>
                    <GlassCard className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <h3 className="text-base font-semibold hover:underline">{r.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.status === "draft" ? "Brouillon" : r.status === "submitted" ? "Soumis" : r.status === "approved" ? "Approuvé" : "Archivé"}
                        {" · "}{formatDate(r.updatedAt)}
                      </p>
                    </GlassCard>
                  </Link>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 pt-4">
            <div>
              <h2 className="text-sm font-semibold">{t("tabs.tasks")}</h2>
              <p className="text-xs text-muted-foreground">{t("tasksShared")}</p>
            </div>
            <GlassCard className="p-5">
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!activeWorkspace?._id || !newTask.trim()) return
                  try {
                    await createTask({
                      workspaceId: activeWorkspace._id,
                      title: newTask.trim(),
                      sourceApp: "bilan",
                      linkedTo: { app: "bilan", type: "project", id: projectId },
                    })
                    setNewTask("")
                  } catch (err: any) {
                    toast.error(err?.message ?? "Erreur")
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder={t("newTaskPlaceholder")}
                  data-testid="new-task-input"
                />
                <Button type="submit" disabled={!newTask.trim()} className="gap-1.5" data-testid="add-task-btn">
                  <Plus className="h-4 w-4" /> {tCommon("create")}
                </Button>
              </form>
            </GlassCard>
            <GlassCard>
              {allTasks === undefined ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty.tasks")}</div>
              ) : (
                <ul className="divide-y divide-border/60" data-testid="project-tasks">
                  {tasks.map((task) => {
                    const done = doneKeys.has(task.status)
                    return (
                      <li key={task._id} className="flex items-center gap-3 px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setTaskStatus({ taskId: task._id, status: done ? "todo" : "done" })}
                          className={done ? "text-success" : "text-muted-foreground"}
                          aria-label="toggle"
                        >
                          <TickCircle className="h-4 w-4" />
                        </button>
                        <span className={done ? "flex-1 text-sm line-through opacity-60" : "flex-1 text-sm"}>
                          {task.title}
                        </span>
                        {task.assignee?.name && (
                          <Badge variant="outline" className="text-[10px]">
                            {task.assignee.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {task.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeTask({ taskId: task._id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 pt-4">
            <h2 className="text-sm font-semibold">{t("tabs.documents")}</h2>
            <GlassCard className="p-5">
              <AttachmentsField linkedTo={{ type: "project", id: projectId }} documentType="other" />
            </GlassCard>
            <GlassCard>
              {(docs ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">{t("empty.documents")}</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {(docs ?? []).map((d) => (
                    <li key={d._id} className="flex items-center gap-3 px-5 py-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate text-sm">{d.name}</span>
                      <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                        A2E Drive
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">{d.contentType ?? ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </TabsContent>

          <TabsContent value="details" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("tabs.details")}</h2>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>{tCommon("edit")}</Button>
              )}
            </div>
            {editing ? (
              <GlassCard className="p-5">
                <form onSubmit={handleSaveProject} className="space-y-4">
                  <div><Label>{tCommon("name")}</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{tCommon("client")}</Label><Input value={editClient} onChange={(e) => setEditClient(e.target.value)} /></div>
                    <div><Label>{t("budget")} ({currency})</Label><Input type="number" step="0.01" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} /></div>
                  </div>
                  <div><Label>{tCommon("status")}</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">{t("status.planning")}</SelectItem>
                        <SelectItem value="active">{t("status.active")}</SelectItem>
                        <SelectItem value="on_hold">{t("status.on_hold")}</SelectItem>
                        <SelectItem value="completed">{t("status.completed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{tCommon("description")}</Label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} /></div>
                  <div><Label>{t("color")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`h-7 w-7 rounded-full border transition ${editColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("save")}</Button>
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>{tCommon("cancel")}</Button>
                  </div>
                </form>
              </GlassCard>
            ) : (
              <GlassCard className="p-5 space-y-3">
                <div><span className="text-xs text-muted-foreground">{tCommon("client")}</span><p className="text-sm font-medium">{project.client}</p></div>
                {project.budget ? <div><span className="text-xs text-muted-foreground">{t("budget")}</span><p className="text-sm font-medium">{formatCurrency(project.budget, currency)}</p></div> : null}
                <div><span className="text-xs text-muted-foreground">{tCommon("status")}</span><p className="text-sm font-medium capitalize">{project.status}</p></div>
                <div><span className="text-xs text-muted-foreground">{t("color")}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ background: project.color || "#ccc" }} />
                    <span className="text-sm text-muted-foreground">{project.color || tCommon("color")}</span>
                  </div>
                </div>
                {project.description ? <div><span className="text-xs text-muted-foreground">{tCommon("description")}</span><p className="text-sm">{project.description}</p></div> : null}
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
