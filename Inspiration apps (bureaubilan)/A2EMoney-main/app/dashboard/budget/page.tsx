"use client"

import * as React from "react"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspace } from "@/lib/workspace-context"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, PiggyBank, Trash2, Loader2 } from "@/components/iconsax"
import { toast } from "sonner"

const CATEGORIES = ["Food", "Transport", "Housing", "Office", "Marketing", "Software", "Travel", "Salaries", "Taxes", "Utilities", "Other"]
const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f59e0b", "#ef4444", "#10b981", "#06b6d4"]

export default function BudgetPage() {
  const t = useTranslations("pages.budget")
  const tCommon = useTranslations("common")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"

  const budgets = useQuery(api.a2e_budgets.list, wsId ? { workspaceId: wsId } : "skip")
  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")
  const create = useMutation(api.a2e_budgets.create)
  const remove = useMutation(api.a2e_budgets.remove)

  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [category, setCategory] = React.useState("Other")
  const [period, setPeriod] = React.useState<"monthly" | "yearly" | "custom">("monthly")
  const [color, setColor] = React.useState(COLORS[0])
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!wsId) return
    try {
      setSaving(true)
      await create({
        workspaceId: wsId,
        name: name.trim(),
        amount: parseFloat(amount),
        category,
        period,
        color,
        currency,
        startDate: new Date(startDate).getTime(),
        endDate: endDate ? new Date(endDate).getTime() : undefined,
      })
      toast.success(t("toasts.created"))
      setOpen(false)
      setName("")
      setAmount("")
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  const projectBudgets = React.useMemo(
    () => (projects ?? []).filter((p: any) => (p.budget ?? 0) > 0),
    [projects],
  )

  const noData =
    budgets !== undefined && budgets.length === 0 && projectBudgets.length === 0

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-full">
                <Plus className="h-4 w-4" /> {t("new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("new")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <DialogBody className="space-y-4 px-1">
                  <div>
                    <Label>{tCommon("name")}</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{tCommon("amount")} ({currency})</Label>
                      <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    <div>
                      <Label>{tCommon("category")}</Label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>{t("period")}</Label>
                      <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="monthly">{t("periods.monthly")}</option>
                        <option value="yearly">{t("periods.yearly")}</option>
                        <option value="custom">{t("periods.custom")}</option>
                      </select>
                    </div>
                    <div>
                      <Label>{t("start")}</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div>
                      <Label>{t("end")}</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        disabled={period !== "custom"}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("color")}</Label>
                    <div className="mt-1 flex gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`h-7 w-7 rounded-full border ${
                            color === c ? "border-foreground" : "border-transparent"
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </DialogBody>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon("create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {budgets === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : noData ? (
          <GlassCard>
            <EmptyState
              icon={PiggyBank}
              title={t("empty.title")}
              description={t("empty.description")}
              action={{ onClick: () => setOpen(true), label: t("new") }}
            />
          </GlassCard>
        ) : (
          <>
            {budgets.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {budgets.map((b: any, idx: number) => {
                  const pct = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0
                  const over = b.spent > b.amount
                  return (
                    <motion.div
                      key={b._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * idx }}
                    >
                      <GlassCard className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
                              <h3 className="text-base font-semibold">{b.name}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {b.category} · {t(`periods.${b.period}`)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => remove({ budgetId: b._id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("spent")}</span>
                            <span className={over ? "font-medium text-destructive" : "font-medium"}>
                              <CountUp
                                end={b.spent || 0}
                                decimals={2}
                                duration={0.6}
                                formattingFn={(v) => formatCurrency(v, b.currency || currency)}
                              />
                              {" / "}
                              {formatCurrency(b.amount, b.currency || currency)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full ${over ? "bg-destructive" : ""}`}
                              style={{ background: over ? undefined : b.color }}
                            />
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Project budgets (auto-tracked from /dashboard/projects) */}
            {projectBudgets.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("projectBudgets")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {projectBudgets.map((p: any, idx: number) => {
                    const pct = p.budget > 0 ? Math.min(100, ((p.spent || 0) / p.budget) * 100) : 0
                    const over = (p.spent || 0) > (p.budget || 0)
                    return (
                      <motion.div
                        key={p._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * idx }}
                      >
                        <GlassCard className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[var(--brand-green)]" />
                                <h3 className="text-base font-semibold">{p.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {p.client} · {t("project")}
                              </p>
                            </div>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              {p.status}
                            </span>
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{t("spent")}</span>
                              <span className={over ? "font-medium text-destructive" : "font-medium"}>
                                <CountUp
                                  end={p.spent || 0}
                                  decimals={2}
                                  duration={0.6}
                                  formattingFn={(v) => formatCurrency(v, currency)}
                                />
                                {" / "}
                                {formatCurrency(p.budget, currency)}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className={`h-full ${over ? "bg-destructive" : "bg-[var(--brand-green)]"}`}
                              />
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
