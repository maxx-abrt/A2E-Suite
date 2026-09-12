"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useWorkspace } from "@/lib/workspace-context"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
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
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"
import {
  Sparkles,
  Search,
  Loader2,
  ExternalLink,
  Star,
  Star1,
  Calendar,
  Refresh,
  HeartHandshake,
  TickCircle,
  Wallet2,
  Global,
  FilterSquare,
  Clock,
  ArrowRight2,
  Trash2,
  Lock,
} from "@/components/iconsax"
import { toast } from "sonner"

const AI_CONSENT_PURPOSE = "ai_grant_matching"
const AI_CONSENT_VERSION = "2026-08-01"

type Facets = {
  total: number
  openNow: number
  callsForProject: number
  audiences: { key: string; count: number }[]
  aidTypes: { key: string; count: number }[]
  categories: { key: string; count: number }[]
  scales: { key: string; count: number }[]
  sources: { key: string; count: number }[]
  builtAt: number
  catalogVersion: number
} | null

type Match = {
  subventionId: string
  score: number
  reason: string
  nextStep?: string
  subvention: any
}

const STATUS_TONES: Record<string, string> = {
  shortlisted: "bg-muted text-foreground",
  preparing: "bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] text-primary",
  submitted: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  granted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
  abandoned: "bg-muted text-muted-foreground",
}

const SCALE_LABELS: Record<string, string> = {
  national: "National",
  regional: "Régional",
  région: "Régional",
  departemental: "Départemental",
  département: "Départemental",
  communal: "Communal",
  commune: "Communal",
  europeen: "Européen",
  europe: "Européen",
  pays: "Pays / PETR",
  "bassin hydrographique": "Bassin hydrographique",
  "ad-hoc": "Territoire",
  adhoc: "Territoire",
}

export default function SubventionsPage() {
  const t = useTranslations("pages.subventions")
  const tCommon = useTranslations("common")
  const { activeWorkspace } = useWorkspace()
  const wsId = activeWorkspace?._id
  const currency = activeWorkspace?.currency ?? "EUR"

  // ------------------------------------------------------------- AI matching
  const [prompt, setPrompt] = React.useState("")
  const [running, setRunning] = React.useState(false)
  const [result, setResult] = React.useState<{
    matches: Match[]
    summary?: string
    cached: boolean
    candidates: number
    model: string
  } | null>(null)

  const aiMatch = useAction(api.a2e_subventions.aiMatch)
  const consents = useQuery(api.gdpr.consents, wsId ? {} : "skip")
  const setConsent = useMutation(api.gdpr.setConsent)
  const [consentOpen, setConsentOpen] = React.useState(false)
  const pendingPrompt = React.useRef<string | null>(null)
  const aiConsented = (consents ?? []).some(
    (c: any) => c.purpose === AI_CONSENT_PURPOSE && c.granted,
  )
  const aiHealth = useQuery(api.a2e_subventions.aiHealth, wsId ? {} : "skip")
  const org = useQuery(api.a2e_org.get, wsId ? { workspaceId: wsId } : "skip")
  const runs = useQuery(api.a2e_subventions.runs, wsId ? { workspaceId: wsId, limit: 6 } : "skip")
  const facets = useQuery(api.a2e_subventions.facets, wsId ? {} : "skip") as Facets
  const sources = useQuery(api.a2e_subventions.sources, wsId ? {} : "skip")
  const saved = useQuery(api.a2e_subventions.listSaved, wsId ? { workspaceId: wsId } : "skip")
  const projects = useQuery(api.projects.list, wsId ? { workspaceId: wsId } : "skip")

  const save = useMutation(api.a2e_subventions.save)
  const updateSaved = useMutation(api.a2e_subventions.updateSaved)
  const removeSaved = useMutation(api.a2e_subventions.removeSaved)
  const convert = useMutation(api.a2e_subventions.convertGrantedToIncome)
  const refreshNow = useAction(api.a2e_subventions.refreshNow)

  // Pre-fill the prompt with the organisation's own mission the first time.
  React.useEffect(() => {
    if (!prompt && org?.projectSummary) setPrompt(org.projectSummary)
    else if (!prompt && org?.objet) setPrompt(org.objet)
  }, [org?.projectSummary, org?.objet]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMatch(e?: React.FormEvent, override?: string) {
    e?.preventDefault()
    const text = (override ?? prompt).trim()
    if (!wsId || text.length < 20) {
      toast.error(t("ai.tooShort"))
      return
    }
    // GDPR art. 6.1.a: the description leaves Bilan only after explicit consent.
    if (!aiConsented) {
      pendingPrompt.current = text
      setConsentOpen(true)
      return
    }
    await runMatch(text)
  }

  async function runMatch(override?: string) {
    const text = (override ?? prompt).trim()
    if (!wsId || text.length < 20) return
    try {
      setRunning(true)
      const res = await aiMatch({ workspaceId: wsId, prompt: text })
      setResult({
        matches: res.matches as Match[],
        summary: res.summary,
        cached: res.cached,
        candidates: res.candidates,
        model: res.model,
      })
      if (res.matches.length === 0) toast.info(t("ai.noMatch"))
    } catch (err: any) {
      toast.error(err?.message || t("ai.failed"))
    } finally {
      setRunning(false)
    }
  }

  async function acceptAiConsent() {
    try {
      await setConsent({ purpose: AI_CONSENT_PURPOSE, granted: true, version: AI_CONSENT_VERSION })
    } catch {
      /* the run is still explicit; never block the user on a logging failure */
    }
    setConsentOpen(false)
    await runMatch(pendingPrompt.current ?? undefined)
  }

  // ------------------------------------------------------------- catalogue
  const [search, setSearch] = React.useState("")
  const [debounced, setDebounced] = React.useState("")
  const [audience, setAudience] = React.useState<string>("")
  const [scale, setScale] = React.useState<string>("")
  const [aidType, setAidType] = React.useState<string>("")
  const [openOnly, setOpenOnly] = React.useState(true)
  const [callOnly, setCallOnly] = React.useState(false)
  const [showFilters, setShowFilters] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 320)
    return () => clearTimeout(timer)
  }, [search])

  const catalogue = usePaginatedQuery(
    api.a2e_subventions.catalogue,
    wsId
      ? {
          search: debounced || undefined,
          audience: audience || undefined,
          perimeterScale: scale || undefined,
          aidType: aidType || undefined,
          openOnly,
          callForProject: callOnly || undefined,
        }
      : "skip",
    { initialNumItems: 12 },
  )

  const savedIds = new Set((saved ?? []).map((s: any) => String(s.subventionId)))

  async function handleSave(subventionId: string, score?: number, reason?: string) {
    if (!wsId) return
    try {
      await save({
        workspaceId: wsId,
        subventionId: subventionId as Id<"a2e_subventions">,
        aiScore: score,
        aiReason: reason,
      })
      toast.success(t("toasts.saved"))
    } catch (err: any) {
      toast.error(err?.message || tCommon("error"))
    }
  }

  const [grantOpen, setGrantOpen] = React.useState<any>(null)
  const [grantAmount, setGrantAmount] = React.useState("")

  async function handleGrant() {
    if (!grantOpen) return
    const amount = parseFloat(grantAmount)
    if (!amount || amount <= 0) {
      toast.error(t("track.amountRequired"))
      return
    }
    try {
      await convert({ savedId: grantOpen._id, amount })
      toast.success(t("toasts.converted"))
      setGrantOpen(null)
      setGrantAmount("")
    } catch (err: any) {
      toast.error(err?.message || tCommon("error"))
    }
  }

  const lastSync = React.useMemo(() => {
    const times = (sources ?? []).map((s: any) => s.lastRunAt ?? 0).filter(Boolean)
    return times.length ? Math.max(...times) : null
  }, [sources])

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* ---------------------------------------------------------- header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {facets ? (
              <span className="rounded-full border border-border bg-card px-3 py-1" data-testid="catalogue-count">
                {t("stats.total", { count: facets.total })}
              </span>
            ) : null}
            {lastSync ? (
              <span className="rounded-full border border-border bg-card px-3 py-1">
                {t("stats.updated", { when: formatDate(lastSync) })}
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              data-testid="refresh-catalogue"
              onClick={async () => {
                if (!wsId) return
                try {
                  const res = await refreshNow({ workspaceId: wsId })
                  toast[res.started ? "success" : "info"](res.started ? t("toasts.refreshing") : res.reason!)
                } catch (err: any) {
                  toast.error(err?.message || tCommon("error"))
                }
              }}
            >
              <Refresh size={14} variant="Bulk" /> {t("refresh")}
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------- AI hero */}
        <GlassCard className="relative overflow-hidden p-0" hoverable={false}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              background:
                "radial-gradient(600px circle at 10% 0%, var(--primary), transparent 55%), radial-gradient(500px circle at 90% 100%, var(--brand-green, #22c55e), transparent 55%)",
            }}
          />
          <form onSubmit={handleMatch} className="relative space-y-4 p-5 sm:p-7">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_16%,var(--card))] text-primary">
                <Sparkles size={18} variant="Bulk" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{t("ai.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
              </div>
            </div>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              data-testid="ai-prompt"
              placeholder={t("ai.placeholder")}
              className="resize-none bg-background/70 text-sm"
            />

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Lock size={11} variant="Bulk" className="mt-0.5 shrink-0" />
              {t("ai.privacyNote")}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  t("ai.examples.assoJeunes"),
                  t("ai.examples.tiersLieu"),
                  t("ai.examples.startup"),
                ].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {example.slice(0, 44)}…
                  </button>
                ))}
              </div>
              <Button
                type="submit"
                disabled={running || !wsId}
                className="gap-2 rounded-full"
                data-testid="ai-run"
              >
                {running ? (
                  <Loader2 size={16} variant="Bulk" className="animate-spin" />
                ) : (
                  <Sparkles size={16} variant="Bulk" />
                )}
                {running ? t("ai.running") : t("ai.cta")}
              </Button>
            </div>

            {aiHealth && !aiHealth.aiStudio && !aiHealth.emergent ? (
              <p className="text-xs text-destructive">{t("ai.notConfigured")}</p>
            ) : null}
          </form>

          {/* AI results */}
          {result ? (
            <div className="relative border-t border-border/70 bg-background/40 p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="gap-1">
                  <TickCircle size={12} variant="Bulk" />
                  {t("ai.resultCount", { count: result.matches.length })}
                </Badge>
                <span>{t("ai.scanned", { count: result.candidates })}</span>
                {result.cached ? <Badge variant="outline">{t("ai.cached")}</Badge> : null}
                <span className="font-mono opacity-60">{result.model}</span>
              </div>
              {result.summary ? (
                <p className="mb-4 rounded-xl border border-border bg-card p-3 text-sm">{result.summary}</p>
              ) : null}
              {result.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ai.noMatch")}</p>
              ) : (
                <ul className="space-y-3" data-testid="ai-results">
                  {result.matches.map((match, index) => (
                    <motion.li
                      key={match.subventionId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <ScoreDot score={match.score} />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {Math.round(match.score * 100)}% {t("ai.fit")}
                            </span>
                          </div>
                          <h3 className="mt-1 text-sm font-semibold leading-snug">
                            {match.subvention.title}
                          </h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                            {match.reason}
                          </p>
                          {match.nextStep ? (
                            <p className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                              <ArrowRight2 size={12} variant="Bulk" className="mt-0.5 shrink-0" />
                              {match.nextStep}
                            </p>
                          ) : null}
                          <SubventionMeta row={match.subvention} />
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            size="sm"
                            variant={savedIds.has(match.subventionId) ? "secondary" : "default"}
                            className="gap-1.5"
                            onClick={() => handleSave(match.subventionId, match.score, match.reason)}
                            data-testid={`ai-save-${match.subventionId}`}
                          >
                            {savedIds.has(match.subventionId) ? (
                              <Star1 size={14} variant="Bulk" />
                            ) : (
                              <Star size={14} variant="Bulk" />
                            )}
                            {savedIds.has(match.subventionId) ? t("saved") : t("save")}
                          </Button>
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <a href={match.subvention.applicationUrl || match.subvention.url} target="_blank" rel="noreferrer">
                              <ExternalLink size={14} variant="Bulk" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </GlassCard>

        {/* --------------------------------------------------- past searches */}
        {(runs ?? []).length > 0 && !result ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("ai.history")}
            </span>
            {(runs ?? []).map((run: any) => (
              <button
                key={run._id}
                type="button"
                onClick={() => {
                  setPrompt(run.prompt)
                  void handleMatch(undefined, run.prompt)
                }}
                className="max-w-[240px] truncate rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={run.prompt}
              >
                {run.prompt}
              </button>
            ))}
          </div>
        ) : null}

        {/* -------------------------------------------------------- tracker */}
        {(saved ?? []).length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <HeartHandshake size={18} variant="Bulk" className="text-primary" />
                {t("track.title")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {t("track.count", { count: (saved ?? []).length })}
              </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {(saved ?? []).map((row: any) => (
                <GlassCard key={row._id} className="p-4" data-testid={`saved-${row._id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {row.subvention?.title ?? t("track.removedSource")}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {(row.subvention?.financers ?? []).slice(0, 2).join(", ")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        STATUS_TONES[row.status],
                      )}
                    >
                      {t(`track.status.${row.status}`)}
                    </span>
                  </div>

                  {row.aiReason ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{row.aiReason}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        updateSaved({ savedId: row._id, status: e.target.value as any })
                      }
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      data-testid={`saved-status-${row._id}`}
                    >
                      {["shortlisted", "preparing", "submitted", "granted", "rejected", "abandoned"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {t(`track.status.${status}`)}
                          </option>
                        ),
                      )}
                    </select>
                    {(projects ?? []).length > 0 ? (
                      <select
                        value={row.projectId ?? ""}
                        onChange={(e) =>
                          updateSaved({
                            savedId: row._id,
                            projectId: e.target.value ? (e.target.value as Id<"projects">) : undefined,
                          })
                        }
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="">{t("track.noProject")}</option>
                        {(projects ?? []).map((project: any) => (
                          <option key={project._id} value={project._id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    {row.incomeExpenseId ? (
                      <Badge variant="secondary" className="gap-1">
                        <Wallet2 size={11} variant="Bulk" />
                        {formatCurrency(row.amountGranted ?? 0, currency)} {t("track.booked")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => {
                          setGrantOpen(row)
                          setGrantAmount(String(row.amountRequested ?? ""))
                        }}
                        data-testid={`saved-convert-${row._id}`}
                      >
                        <Wallet2 size={13} variant="Bulk" /> {t("track.markGranted")}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8 text-destructive"
                      onClick={() => removeSaved({ savedId: row._id })}
                      aria-label={tCommon("delete")}
                    >
                      <Trash2 size={13} variant="Bulk" />
                    </Button>
                  </div>

                  {row.deadline ? (
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock size={11} variant="Bulk" />
                      {t("track.deadline", { when: formatDate(row.deadline) })}
                    </p>
                  ) : null}
                </GlassCard>
              ))}
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ catalogue */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">{t("catalogue.title")}</h2>
            <div className="flex flex-1 items-center gap-2 sm:max-w-md">
              <div className="relative flex-1">
                <Search
                  size={15}
                  variant="Bulk"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("catalogue.searchPlaceholder")}
                  className="pl-9"
                  data-testid="catalogue-search"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters((v) => !v)}
                aria-label={t("catalogue.filters")}
                data-testid="toggle-filters"
              >
                <FilterSquare size={16} variant="Bulk" />
              </Button>
            </div>
          </div>

          {showFilters ? (
            <GlassCard className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" hoverable={false}>
              <FacetSelect
                label={t("catalogue.audience")}
                value={audience}
                onChange={setAudience}
                options={facets?.audiences ?? []}
                allLabel={t("catalogue.all")}
              />
              <FacetSelect
                label={t("catalogue.scale")}
                value={scale}
                onChange={setScale}
                options={facets?.scales ?? []}
                allLabel={t("catalogue.all")}
                labelMap={SCALE_LABELS}
              />
              <FacetSelect
                label={t("catalogue.aidType")}
                value={aidType}
                onChange={setAidType}
                options={facets?.aidTypes ?? []}
                allLabel={t("catalogue.all")}
              />
              <div className="flex flex-col justify-end gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(e) => setOpenOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[var(--primary)]"
                    data-testid="filter-open"
                  />
                  {t("catalogue.openOnly")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={callOnly}
                    onChange={(e) => setCallOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[var(--primary)]"
                  />
                  {t("catalogue.callsOnly")}
                </label>
              </div>
            </GlassCard>
          ) : null}

          {catalogue.status === "LoadingFirstPage" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-[var(--radius)] border border-border bg-card" />
              ))}
            </div>
          ) : catalogue.results.length === 0 ? (
            <GlassCard>
              <EmptyState
                icon={Global}
                title={t("catalogue.empty.title")}
                description={t("catalogue.empty.description")}
              />
            </GlassCard>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {catalogue.results.map((row: any, index: number) => (
                  <motion.div
                    key={row._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 8) * 0.03 }}
                  >
                    <GlassCard className="flex h-full flex-col p-4" data-testid={`subvention-${row._id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold leading-snug">{row.title}</h3>
                        {row.isCallForProject ? (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {t("catalogue.callBadge")}
                          </Badge>
                        ) : null}
                      </div>
                      {row.description ? (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {row.description}
                        </p>
                      ) : null}
                      <SubventionMeta row={row} />
                      <div className="mt-auto flex items-center gap-2 pt-3">
                        <Button
                          size="sm"
                          variant={savedIds.has(String(row._id)) ? "secondary" : "outline"}
                          className="gap-1.5"
                          onClick={() => handleSave(String(row._id))}
                          data-testid={`save-${row._id}`}
                        >
                          {savedIds.has(String(row._id)) ? (
                            <Star1 size={13} variant="Bulk" />
                          ) : (
                            <Star size={13} variant="Bulk" />
                          )}
                          {savedIds.has(String(row._id)) ? t("saved") : t("save")}
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="gap-1.5 text-xs">
                          <a href={row.applicationUrl || row.url} target="_blank" rel="noreferrer">
                            {t("catalogue.open")} <ExternalLink size={12} variant="Bulk" />
                          </a>
                        </Button>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
              {catalogue.status === "CanLoadMore" ? (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => catalogue.loadMore(12)}
                    data-testid="catalogue-load-more"
                  >
                    {t("catalogue.loadMore")}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* sources footer */}
        {(sources ?? []).length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {t("catalogue.sourcesLabel")}{" "}
            {(sources ?? [])
              .map((s: any) => `${s.label} (${s.itemCount ?? 0})`)
              .join(" · ")}
          </p>
        ) : null}
      </div>

      {/* AI consent dialog (art. 6.1.a) */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ai.consentTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="px-1">
            <p className="text-sm leading-relaxed text-muted-foreground">{t("ai.consentBody")}</p>
          </DialogBody>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setConsentOpen(false)}>
              {t("ai.consentDecline")}
            </Button>
            <Button onClick={acceptAiConsent} data-testid="ai-consent-accept">
              {t("ai.consentAccept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* grant → income dialog */}
      <Dialog open={Boolean(grantOpen)} onOpenChange={(open) => !open && setGrantOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("track.grantTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3 px-1">
            <p className="text-sm text-muted-foreground">{t("track.grantHelp")}</p>
            <div>
              <Label>{t("track.grantAmount", { currency })}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                data-testid="grant-amount"
                autoFocus
              />
            </div>
          </DialogBody>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setGrantOpen(null)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleGrant} data-testid="grant-confirm">
              {t("track.grantConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ScoreDot({ score }: { score: number }) {
  const tone =
    score >= 0.75 ? "bg-emerald-500" : score >= 0.5 ? "bg-amber-500" : "bg-muted-foreground"
  return <span className={cn("h-2 w-2 rounded-full", tone)} aria-hidden />
}

function SubventionMeta({ row }: { row: any }) {
  const scale = row.perimeterScale ? SCALE_LABELS[row.perimeterScale] ?? row.perimeterScale : null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
      {(row.financers ?? []).slice(0, 1).map((financer: string) => (
        <span key={financer} className="rounded-full bg-muted px-2 py-0.5">
          {financer.length > 42 ? `${financer.slice(0, 42)}…` : financer}
        </span>
      ))}
      {scale ? <span className="rounded-full bg-muted px-2 py-0.5">{scale}</span> : null}
      {(row.aidTypes ?? []).slice(0, 2).map((type: string) => (
        <span key={type} className="rounded-full bg-muted px-2 py-0.5">
          {type}
        </span>
      ))}
      {row.rateMax ? (
        <span className="rounded-full bg-muted px-2 py-0.5">
          {row.rateMin ?? 0}–{row.rateMax}%
        </span>
      ) : null}
      {row.submissionDeadline ? (
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
          <Calendar size={10} variant="Bulk" />
          {formatDate(row.submissionDeadline)}
        </span>
      ) : null}
    </div>
  )
}

function FacetSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  labelMap,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { key: string; count: number }[]
  allLabel: string
  labelMap?: Record<string, string>
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {(labelMap?.[option.key] ?? option.key).slice(0, 40)} ({option.count})
          </option>
        ))}
      </select>
    </div>
  )
}
