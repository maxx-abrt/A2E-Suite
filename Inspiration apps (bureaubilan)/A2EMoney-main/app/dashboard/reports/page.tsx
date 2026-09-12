"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspace } from "@/lib/workspace-context"
import { formatCurrency } from "@/lib/utils"
import { GlassCard } from "@/components/glass-card"
import {
  AdvancedNormalizedIncidentReport,
  ActivityStatsCard,
  CategoryBreakdownBar,
  BudgetGauge,
  type Txn,
} from "@/components/charts/analytics"
import {
  TrendUp,
  TrendDown,
  Wallet2,
  ReceiptItem,
  FolderOpen,
  ClipboardText,
  Activity,
  Loader2,
} from "@/components/iconsax"

export default function ReportsPage() {
  const t = useTranslations("pages.reports")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"

  const expenses = useQuery(api.a2e_expenses.list, wsId ? { workspaceId: wsId } : "skip")
  const invoices = useQuery(api.a2e_invoices.list, wsId ? { workspaceId: wsId } : "skip")
  const budgets = useQuery(api.a2e_budgets.list, wsId ? { workspaceId: wsId } : "skip")
  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")
  const activities = useQuery(
    api.a2e_activity.list,
    wsId ? { workspaceId: wsId, limit: 8 } : "skip",
  )

  // Stable timestamp so memos don't churn on every render.
  const now = React.useMemo(() => Date.now(), [wsId])

  const loading = !wsId || expenses === undefined || invoices === undefined || budgets === undefined || projects === undefined

  /* Safe arrays so we never operate on undefined. */
  const exp = React.useMemo(
    () => (expenses ?? []).filter((e) => e.type === "expense"),
    [expenses],
  )
  const inc = React.useMemo(
    () => (expenses ?? []).filter((e) => e.type === "income"),
    [expenses],
  )

  const transactions: Txn[] = React.useMemo(
    () =>
      (expenses ?? []).map((e) => ({
        date: e.date,
        amount: e.amount,
        type: e.type as "income" | "expense",
        category: e.category,
      })),
    [expenses],
  )

  /* KPI math */
  const month = 30 * 86400 * 1000
  const lastWindow = now - month
  const prevWindow = now - 2 * month

  const totalIncome = inc.reduce((a, b) => a + b.amount, 0)
  const totalExpense = exp.reduce((a, b) => a + b.amount, 0)
  const totalInvoiced = (invoices ?? []).reduce(
    (a, b) => a + (b.items || []).reduce((c, d) => c + d.quantity * d.unitPrice, 0),
    0,
  )

  const incomePrev = inc
    .filter((e) => e.date >= prevWindow && e.date < lastWindow)
    .reduce((a, b) => a + b.amount, 0)
  const expensePrev = exp
    .filter((e) => e.date >= prevWindow && e.date < lastWindow)
    .reduce((a, b) => a + b.amount, 0)

  /* Sparkline series - last 12 weeks */
  const sparkData = React.useMemo(() => {
    const weeks = 12
    const incomeSeries = new Array(weeks).fill(0) as number[]
    const expenseSeries = new Array(weeks).fill(0) as number[]
    const oneWeek = 7 * 86400 * 1000
    const start = now - weeks * oneWeek
    for (const tr of expenses ?? []) {
      if (tr.date < start) continue
      const idx = Math.min(weeks - 1, Math.floor((tr.date - start) / oneWeek))
      if (tr.type === "income") incomeSeries[idx] += tr.amount
      else expenseSeries[idx] += tr.amount
    }
    return { incomeSeries, expenseSeries }
  }, [expenses, now])

  /* Category breakdown */
  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of exp) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [exp])

  /* Invoice status breakdown */
  const invoiceStatus = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const i of invoices ?? []) {
      const total = (i.items || []).reduce((a, b) => a + b.quantity * b.unitPrice, 0)
      const ref = map.get(i.status) || { count: 0, total: 0 }
      ref.count++
      ref.total += total
      map.set(i.status, ref)
    }
    return Array.from(map.entries()).map(([status, v]) => ({ status, ...v }))
  }, [invoices])

  /* Project budget rollups (auto-linked via projects.list server-computed spent) */
  const projectBudgets = React.useMemo(() => {
    return (projects ?? [])
      .filter((p: any) => (p.budget ?? 0) > 0)
      .map((p: any) => ({
        _id: p._id,
        name: p.name,
        client: p.client,
        status: p.status,
        used: p.spent || 0,
        total: p.budget || 0,
      }))
  }, [projects])

  /* Show ALL budgets (categorical) + project budgets in the same column */
  const allBudgetCards = React.useMemo(() => {
    const cat = (budgets ?? []).map((b: any) => ({
      key: `b-${b._id}`,
      kind: "category" as const,
      name: b.name,
      sub: b.category,
      used: b.spent || 0,
      total: b.amount,
      currency: b.currency || currency,
    }))
    const proj = projectBudgets.map((p: any) => ({
      key: `p-${p._id}`,
      kind: "project" as const,
      name: p.name,
      sub: p.client,
      used: p.used,
      total: p.total,
      currency,
    }))
    return [...cat, ...proj].slice(0, 4)
  }, [budgets, projectBudgets, currency])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 size={20} variant="Bulk" className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasAnyData =
    (expenses?.length ?? 0) > 0 ||
    (invoices?.length ?? 0) > 0 ||
    (projects?.length ?? 0) > 0 ||
    (budgets?.length ?? 0) > 0

  return (
    <div className="relative px-4 py-8 sm:px-6 lg:px-8">
      <BgGlow />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description", { workspace: activeWorkspace?.name ?? "" })}
          </p>
        </div>

        {!hasAnyData ? (
          <GlassCard className="py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard/expenses"
                className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background"
              >
                + Expense
              </Link>
              <Link
                href="/dashboard/invoices"
                className="rounded-full border px-4 py-1.5 text-xs font-medium"
              >
                + Invoice
              </Link>
              <Link
                href="/dashboard/projects"
                className="rounded-full border px-4 py-1.5 text-xs font-medium"
              >
                + Project
              </Link>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* KPI strip */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ActivityStatsCard
                label={t("totals.income")}
                value={totalIncome}
                previousValue={incomePrev || undefined}
                series={sparkData.incomeSeries}
                currency={currency}
                tone="positive"
                icon={TrendUp}
                delay={0}
              />
              <ActivityStatsCard
                label={t("totals.expenses")}
                value={totalExpense}
                previousValue={expensePrev || undefined}
                series={sparkData.expenseSeries}
                currency={currency}
                tone="negative"
                icon={TrendDown}
                delay={0.05}
              />
              <ActivityStatsCard
                label={t("totals.invoiced")}
                value={totalInvoiced}
                series={sparkData.incomeSeries}
                currency={currency}
                tone="neutral"
                icon={ReceiptItem}
                delay={0.1}
              />
              <ActivityStatsCard
                label={t("totals.net")}
                value={totalIncome - totalExpense}
                previousValue={(incomePrev || 0) - (expensePrev || 0)}
                series={sparkData.incomeSeries.map(
                  (v, i) => v - (sparkData.expenseSeries[i] ?? 0),
                )}
                currency={currency}
                tone={totalIncome - totalExpense >= 0 ? "positive" : "negative"}
                icon={Wallet2}
                delay={0.15}
              />
            </div>

            {/* Composition */}
            <AdvancedNormalizedIncidentReport
              transactions={transactions}
              currency={currency}
            />

            {/* Category + Budgets */}
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CategoryBreakdownBar data={byCategory} currency={currency} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {allBudgetCards.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-5 text-center text-xs text-muted-foreground backdrop-blur-xl">
                    {t("noData")}
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <Link
                        href="/dashboard/budget"
                        className="rounded-full bg-foreground px-3 py-1 text-[10px] font-medium text-background"
                      >
                        + Budget
                      </Link>
                    </div>
                  </div>
                ) : (
                  allBudgetCards.map((b) => (
                    <BudgetGauge
                      key={b.key}
                      label={`${b.kind === "project" ? "\u25C6 " : ""}${b.name}`}
                      spent={b.used}
                      total={b.total}
                      currency={b.currency}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Linked entities: Projects + Invoices statuses + recent activity */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Projects */}
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <FolderOpen size={16} variant="Bulk" className="text-primary" />
                    Projects
                  </h3>
                  <Link href="/dashboard/projects" className="text-xs text-muted-foreground hover:text-foreground">
                    Open
                  </Link>
                </div>
                {(projects ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No projects yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {(projects ?? []).slice(0, 5).map((p: any) => {
                      const pct = p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0
                      return (
                        <li key={p._id}>
                          <Link
                            href={`/dashboard/projects`}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                            <span className="font-numeric text-muted-foreground">
                              <CountUp
                                end={p.spent || 0}
                                duration={0.6}
                                formattingFn={(v) => formatCurrency(v, currency)}
                              />
                            </span>
                          </Link>
                          {p.budget > 0 && (
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6 }}
                                className="h-full bg-[var(--brand-green)]"
                              />
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </GlassCard>

              {/* Invoice status */}
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ClipboardText size={16} variant="Bulk" className="text-primary" />
                    Invoice statuses
                  </h3>
                  <Link href="/dashboard/invoices" className="text-xs text-muted-foreground hover:text-foreground">
                    Open
                  </Link>
                </div>
                {invoiceStatus.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No invoices yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {invoiceStatus.map((s) => (
                      <li key={s.status} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-muted-foreground">{s.status}</span>
                        <span className="font-numeric font-medium">
                          {s.count} · {formatCurrency(s.total, currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>

              {/* Recent activity */}
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Activity size={16} variant="Bulk" className="text-primary" />
                    Recent activity
                  </h3>
                  <Link href="/dashboard/activity" className="text-xs text-muted-foreground hover:text-foreground">
                    All
                  </Link>
                </div>
                {(activities ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {(activities ?? []).slice(0, 6).map((a: any) => (
                      <li key={a._id} className="flex items-start justify-between gap-3 text-xs">
                        <span className="min-w-0 flex-1 truncate">{a.action.replace(/\./g, " ")}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BgGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
      <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-1/4 top-10 h-64 w-64 translate-x-1/2 rounded-full bg-[var(--brand-green)]/12 blur-3xl" />
    </div>
  )
}
