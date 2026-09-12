"use client"

import * as React from "react"
import { motion } from "framer-motion"
import CountUp from "react-countup"
import { useTranslations } from "next-intl"
import { GlassCard } from "@/components/glass-card"
import { ArrowUp, ArrowDown, Chart2, TrendUp, Activity } from "@/components/iconsax"
import { formatCurrency } from "@/lib/utils"

/* Brand-styled, dependency-free SVG charts (replaces reaviz). */

const PURPLE = "var(--chart-1)"
const GREEN = "var(--chart-2)"

export type Txn = {
  date: number
  amount: number
  type: "income" | "expense"
  category?: string
}

function bucketByMonth(txns: Txn[]) {
  const buckets = new Map<string, { income: number; expense: number; date: Date }>()
  for (const t of txns) {
    const d = new Date(t.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const ref = buckets.get(key) ?? {
      income: 0,
      expense: 0,
      date: new Date(d.getFullYear(), d.getMonth(), 1),
    }
    if (t.type === "income") ref.income += t.amount
    else ref.expense += t.amount
    buckets.set(key, ref)
  }
  return Array.from(buckets.values()).sort((a, b) => +a.date - +b.date)
}

/* ── Sparkline (inline SVG) ───────────────────────────────────────────── */
function SvgSparkline({ data, color = PURPLE }: { data: number[]; color?: string }) {
  const id = React.useId().replace(/[:]/g, "")
  const w = 200
  const h = 52
  const pad = 4
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const step = (w - pad * 2) / Math.max(1, data.length - 1)
  const pts = data.map((v, i) => {
    const x = pad + i * step
    const y = h - pad - ((v - min) / span) * (h - pad * 2)
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
    </svg>
  )
}

/* ── Stacked normalized area (income vs expense %) ────────────────────── */
export function AdvancedNormalizedIncidentReport({
  transactions,
  currency = "EUR",
}: {
  transactions: Txn[]
  currency?: string
}) {
  const t = useTranslations("pages.reports")
  const months = React.useMemo(() => bucketByMonth(transactions), [transactions])

  const totalIn = transactions.filter((x) => x.type === "income").reduce((a, b) => a + b.amount, 0)
  const totalOut = transactions.filter((x) => x.type === "expense").reduce((a, b) => a + b.amount, 0)
  const net = totalIn - totalOut

  const W = 600
  const H = 220
  const n = months.length
  const ratios = months.map((m) => {
    const tot = m.income + m.expense
    return tot > 0 ? m.income / tot : 0.5
  })
  const xFor = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const incomeLine = ratios.map((r, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${(H - r * H).toFixed(1)}`).join(" ")
  const incomeArea = `${incomeLine} L${xFor(n - 1).toFixed(1)},${H} L${xFor(0).toFixed(1)},${H} Z`
  const expenseArea = `M${xFor(0).toFixed(1)},0 ${ratios.map((r, i) => `L${xFor(i).toFixed(1)},${(H - r * H).toFixed(1)}`).join(" ")} L${xFor(n - 1).toFixed(1)},0 Z`

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Chart2 size={16} variant="Bulk" className="text-primary" />
            {t("composition.title")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("composition.subtitle")}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <Metric label={t("totals.income")} value={totalIn} currency={currency} tone="positive" />
          <Metric label={t("totals.expenses")} value={totalOut} currency={currency} tone="negative" />
          <Metric label={t("totals.net")} value={net} currency={currency} tone={net >= 0 ? "positive" : "negative"} />
        </div>
      </div>

      <div className="relative h-[260px] w-full p-3">
        {n === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
            <path d={expenseArea} fill={GREEN} fillOpacity="0.22" />
            <path d={incomeArea} fill={PURPLE} fillOpacity="0.28" />
            <path d={incomeLine} fill="none" stroke={PURPLE} strokeWidth="2.5" />
          </svg>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border/60 px-5 py-3 text-xs">
        <LegendDot color={PURPLE} label={t("totals.income")} />
        <LegendDot color={GREEN} label={t("totals.expenses")} />
      </div>
    </GlassCard>
  )
}

function Metric({
  label,
  value,
  currency,
  tone,
}: {
  label: string
  value: number
  currency: string
  tone: "positive" | "negative"
}) {
  const toneCls = tone === "positive" ? "text-success" : "text-destructive"
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-numeric mt-0.5 text-sm font-semibold ${toneCls}`}>
        <CountUp end={value} duration={1.1} decimals={0} separator=" " formattingFn={(v) => formatCurrency(v, currency)} />
      </p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

/* ── KPI card with sparkline ──────────────────────────────────────────── */
export function ActivityStatsCard({
  label,
  value,
  previousValue,
  series,
  currency,
  format = "currency",
  tone = "neutral",
  icon: Icon = Activity,
  delay = 0,
}: {
  label: string
  value: number
  previousValue?: number
  series: number[]
  currency?: string
  format?: "currency" | "number"
  tone?: "positive" | "negative" | "neutral"
  icon?: React.ComponentType<{ size?: number | string; variant?: any; className?: string }>
  delay?: number
}) {
  const delta =
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null
  const up = (delta ?? 0) >= 0

  const toneCls =
    tone === "positive"
      ? "bg-success/10 text-success"
      : tone === "negative"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary"
  const sparkColor = tone === "negative" ? "var(--destructive)" : tone === "positive" ? "var(--chart-2)" : PURPLE

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
    >
      <GlassCard className="group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
            <p className="font-numeric mt-2 text-2xl font-semibold tracking-tight">
              <CountUp
                end={value}
                duration={1.2}
                decimals={format === "currency" ? 2 : 0}
                decimal=","
                separator=" "
                formattingFn={(v) =>
                  format === "currency" ? formatCurrency(v, currency ?? "EUR") : String(Math.round(v))
                }
              />
            </p>
            {delta !== null && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium">
                {up ? (
                  <ArrowUp size={10} variant="Bulk" className="text-success" />
                ) : (
                  <ArrowDown size={10} variant="Bulk" className="text-destructive" />
                )}
                <span className={up ? "text-success" : "text-destructive"}>{Math.abs(delta).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneCls} transition-transform group-hover:scale-110`}>
            <Icon size={18} variant="Bulk" />
          </div>
        </div>
        <div className="-mx-2 mt-3 h-14">
          {series.length > 1 ? (
            <SvgSparkline data={series} color={sparkColor} />
          ) : (
            <div className="flex h-full items-center text-[10px] text-muted-foreground">—</div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

/* ── Horizontal category bars ─────────────────────────────────────────── */
export function CategoryBreakdownBar({
  data,
  currency = "EUR",
}: {
  data: { category: string; amount: number }[]
  currency?: string
}) {
  const t = useTranslations("pages.reports")
  const max = Math.max(...data.map((d) => d.amount), 1)
  const sorted = [...data].sort((a, b) => b.amount - a.amount)
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TrendUp size={16} variant="Bulk" className="text-primary" />
            {t("byCategory")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("totals.expenses")} · {currency}
          </p>
        </div>
      </div>
      <div className="min-h-[260px] w-full space-y-3 p-5">
        {sorted.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
        ) : (
          sorted.map((d) => (
            <div key={d.category}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">{d.category || "—"}</span>
                <span className="font-numeric text-muted-foreground">{formatCurrency(d.amount, currency)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (d.amount / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${PURPLE}, ${GREEN})`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}

/* ── Radial budget gauge (SVG arc) ────────────────────────────────────── */
export function BudgetGauge({
  label,
  spent,
  total,
  currency = "EUR",
}: {
  label: string
  spent: number
  total: number
  currency?: string
}) {
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0
  const over = total > 0 && spent > total
  const R = 54
  const C = 2 * Math.PI * R
  const dash = (pct / 100) * C
  const color = over ? "var(--destructive)" : pct > 85 ? "var(--warning)" : PURPLE
  return (
    <GlassCard className="p-5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="relative mx-auto mt-2 h-32 w-32">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={R} fill="none" stroke="var(--muted)" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-numeric text-base font-semibold">{pct.toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">
            {formatCurrency(spent, currency)} / {formatCurrency(total, currency)}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}
