"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspace } from "@/lib/workspace-context"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Receipt,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Activity as ActivityIcon,
} from "@/components/iconsax"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"

export default function DashboardPage() {
  const t = useTranslations("pages.dashboard")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"

  const invoices = useQuery(api.a2e_invoices.list, wsId ? { workspaceId: wsId } : "skip")
  const expenses = useQuery(api.a2e_expenses.list, wsId ? { workspaceId: wsId } : "skip")
  const activities = useQuery(
    api.a2e_activity.list,
    wsId ? { workspaceId: wsId, limit: 6 } : "skip",
  )
  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")

  const projectMap = React.useMemo(() => {
    const m = new Map<string, any>()
    for (const p of projects ?? []) m.set(p._id, p)
    return m
  }, [projects])

  const now = Date.now()
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  const totals = React.useMemo(() => {
    const exps = expenses ?? []
    const income = exps.filter((e) => e.type === "income").reduce((a, b) => a + b.amount, 0)
    const out = exps.filter((e) => e.type === "expense").reduce((a, b) => a + b.amount, 0)
    const incomeMonth = exps
      .filter((e) => e.type === "income" && e.date >= monthAgo)
      .reduce((a, b) => a + b.amount, 0)
    const outMonth = exps
      .filter((e) => e.type === "expense" && e.date >= monthAgo)
      .reduce((a, b) => a + b.amount, 0)
    return { balance: income - out, income, out, incomeMonth, outMonth }
  }, [expenses, monthAgo])

  const pendingInvoices = (invoices ?? []).filter(
    (inv) => inv.status === "sent" || inv.status === "overdue",
  )

  const recentTransactions = React.useMemo(() => {
    return (expenses ?? [])
      .slice()
      .sort((a, b) => b.date - a.date)
      .slice(0, 6)
  }, [expenses])

  if (!activeWorkspace) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState
          icon={Wallet}
          title={t("welcome")}
          description={t("selectWorkspace")}
        />
      </div>
    )
  }

  return (
    <div className="relative px-4 py-8 sm:px-6 lg:px-8">
      <BackgroundGlow />
      <div className="relative mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-sm text-muted-foreground">{t("welcome")}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {activeWorkspace.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {activeWorkspace.type === "business" ? (
                <Building2 className="h-3.5 w-3.5" />
              ) : activeWorkspace.type === "association" ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <Wallet className="h-3.5 w-3.5" />
              )}
              <span>{activeWorkspace.type ?? "workspace"}</span>
              <span>·</span>
              <span className="capitalize">{activeWorkspace.role}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="gap-2 rounded-full">
              <Link href="/dashboard/expenses?new=1">
                <Plus className="h-4 w-4" />
                {t("addExpense")}
              </Link>
            </Button>
            <Button asChild className="gap-2 rounded-full shadow-sm">
              <Link href="/dashboard/invoices?new=1">
                <Plus className="h-4 w-4" />
                {t("newInvoice")}
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* KPI cards — bento color-blocking (white / lime / ink / purple) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("stats.totalBalance")}
            value={totals.balance}
            currency={currency}
            fill="white"
            icon={Wallet}
            delay={0}
          />
          <KpiCard
            label={t("stats.monthlyIncome")}
            value={totals.incomeMonth}
            currency={currency}
            fill="lime"
            icon={TrendingUp}
            delay={0.05}
          />
          <KpiCard
            label={t("stats.monthlyExpenses")}
            value={totals.outMonth}
            currency={currency}
            fill="ink"
            icon={TrendingDown}
            delay={0.1}
          />
          <KpiCard
            label={t("stats.pendingInvoices")}
            count={pendingInvoices.length}
            fill="purple"
            icon={FileText}
            delay={0.15}
          />
        </div>

        {/* Recent transactions + pending invoices */}
        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h2 className="text-sm font-semibold">{t("recentTransactions.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("recentTransactions.description")}</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1">
                <Link href="/dashboard/expenses">
                  {t("recentTransactions.viewAll")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {recentTransactions.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={t("recentTransactions.title")}
                description={t("recentTransactions.empty")}
                action={{ href: "/dashboard/expenses?new=1", label: t("addExpense") }}
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentTransactions.map((tr, idx) => {
                  const isIn = tr.type === "income"
                  return (
                    <motion.li
                      key={tr._id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.02 * idx, duration: 0.25 }}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isIn ? "bg-success/10 text-success" : "bg-muted text-foreground"
                          }`}
                        >
                          {isIn ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tr.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tr.date)} · {tr.category}
                            {tr.projectId && projectMap.get(tr.projectId) && (
                              <span className="ml-1 inline-flex items-center gap-1">
                                · <span className="h-1.5 w-1.5 rounded-full" style={{ background: projectMap.get(tr.projectId).color || "#ccc" }} />
                                {projectMap.get(tr.projectId).name}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-numeric text-sm font-medium ${
                          isIn ? "text-success" : "text-foreground"
                        }`}
                      >
                        {isIn ? "+" : "-"}
                        {formatCurrency(tr.amount, tr.currency ?? currency)}
                      </span>
                    </motion.li>
                  )
                })}
              </ul>
            )}
          </GlassCard>
          <div className="space-y-6">
            <GlassCard>
              <div className="flex items-center justify-between border-b border-border/60 p-5">
                <div>
                  <h2 className="text-sm font-semibold">{t("pendingInvoices.title")}</h2>
                  <p className="text-xs text-muted-foreground">{t("pendingInvoices.description")}</p>
                </div>
              </div>
              {pendingInvoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t("pendingInvoices.title")}
                  description={t("pendingInvoices.empty")}
                  action={{ href: "/dashboard/invoices?new=1", label: t("newInvoice") }}
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {pendingInvoices.slice(0, 5).map((inv) => {
                    const total = inv.items.reduce(
                      (a, b) => a + b.quantity * b.unitPrice,
                      0,
                    )
                    return (
                      <li
                        key={inv._id}
                        className="flex items-center justify-between gap-3 px-5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{inv.client}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.number} · {formatDate(inv.dueDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={
                              inv.status === "overdue"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/15 text-warning"
                            }
                          >
                            {inv.status}
                          </Badge>
                          <span className="font-numeric text-sm font-medium">
                            {formatCurrency(total, inv.currency)}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="border-t border-border/60 p-3">
                <Button asChild variant="ghost" size="sm" className="w-full justify-center">
                  <Link href="/dashboard/invoices">{t("pendingInvoices.manage")}</Link>
                </Button>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between border-b border-border/60 p-5">
                <div>
                  <h2 className="text-sm font-semibold">{t("activity.title")}</h2>
                  <p className="text-xs text-muted-foreground">{t("activity.description")}</p>
                </div>
              </div>
              {(activities ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground">
                  {t("activity.empty")}
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {(activities ?? []).map((a: any) => (
                    <li key={a._id} className="flex items-start gap-3 px-5 py-3 text-xs">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <ActivityIcon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {a.actorName ?? "Someone"}{" "}
                          <span className="font-normal text-muted-foreground">
                            {a.action.replace(/_/g, " ").replace(/\./g, " ")}
                          </span>
                        </p>
                        <p className="text-muted-foreground">{formatDate(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
      <div className="absolute left-1/4 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute right-1/4 top-10 h-64 w-64 translate-x-1/2 rounded-full bg-[var(--brand-green)]/14 blur-3xl" />
    </div>
  )
}

function KpiCard({
  label,
  value,
  count,
  currency,
  fill = "white",
  icon: Icon,
  delay = 0,
}: {
  label: string
  value?: number
  count?: number
  currency?: string
  fill?: "white" | "lime" | "ink" | "purple"
  icon: React.ComponentType<{ className?: string }>
  delay?: number
}) {
  const tileCls =
    fill === "lime"
      ? "tile-lime"
      : fill === "ink"
      ? "tile-ink"
      : fill === "purple"
      ? "tile-purple"
      : "bento-tile"
  const iconWrap =
    fill === "white"
      ? "bg-secondary text-foreground border border-border"
      : fill === "lime"
      ? "bg-foreground/10 text-[var(--brand-green-ink)]"
      : "bg-white/15 text-current"
  const labelCls = fill === "white" ? "text-muted-foreground" : "opacity-75"
  const isCurrency = value !== undefined
  const displayed = isCurrency ? (value as number) : (count as number)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -2 }}
      className={`group relative overflow-hidden p-5 transition-[transform,box-shadow] duration-200 ${tileCls}`}
      data-testid={`kpi-card-${fill}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium uppercase tracking-wider ${labelCls}`}>
          {label}
        </p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconWrap}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-numeric text-3xl font-semibold tracking-tight">
        {isCurrency ? (
          <CountUp
            end={displayed}
            duration={1.2}
            decimals={2}
            decimal=","
            separator=" "
            formattingFn={(v) => formatCurrency(v, currency)}
          />
        ) : (
          <CountUp end={displayed ?? 0} duration={0.9} />
        )}
      </p>
    </motion.div>
  )
}
