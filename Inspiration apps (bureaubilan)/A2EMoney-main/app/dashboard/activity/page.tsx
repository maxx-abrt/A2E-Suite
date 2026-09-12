"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { useActivities, useWorkspace } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { formatDate } from "@/lib/utils"
import { Activity, Loader2, ShieldTick } from "@/components/iconsax"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import { GlassCard } from "@/components/glass-card"

type Row = {
  id: string
  actor: string
  action: string
  targetType: string
  createdAt: number
  source: "core" | "bilan"
}

/**
 * Unified audit trail: A2E Core's shared trail (workspace, members, files,
 * tasks… from every suite app) merged with Bilan's own financial trail.
 */
export default function ActivityPage() {
  const t = useTranslations("pages.activity")
  const { activeWorkspaceId } = useWorkspace()
  const coreActivities = useActivities(activeWorkspaceId, 200)
  const bilanActivities = useQuery(
    api.a2e_activity.list,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId, limit: 200 } : "skip",
  )

  const rows: Row[] | undefined = React.useMemo(() => {
    if (coreActivities === undefined && bilanActivities === undefined) return undefined
    const merged: Row[] = []
    for (const a of coreActivities ?? []) {
      merged.push({
        id: a._id,
        actor: a.actor?.name ?? a.actor?.email ?? "—",
        action: a.action,
        targetType: a.targetType,
        createdAt: a.createdAt,
        source: "core",
      })
    }
    for (const a of bilanActivities ?? []) {
      merged.push({
        id: a._id,
        actor: a.actorName ?? "—",
        action: a.action,
        targetType: a.targetType,
        createdAt: a.createdAt,
        source: "bilan",
      })
    }
    return merged.sort((a, b) => b.createdAt - a.createdAt)
  }, [coreActivities, bilanActivities])

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldTick className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p>{t("auditNotice")}</p>
        </div>
        <GlassCard>
          {rows === undefined ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={Activity} title={t("empty.title")} description={t("empty.description")} />
          ) : (
            <ul className="divide-y divide-border/60" data-testid="activity-list">
              {rows.map((a, idx) => (
                <motion.li
                  key={`${a.source}-${a.id}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(0.3, 0.01 * idx) }}
                  className="flex items-start gap-3 px-5 py-3 text-sm"
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-muted-foreground">
                        {a.action.replace(/_/g, " ").replace(/\./g, " ")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.createdAt)} · {a.targetType}
                    </p>
                  </div>
                  <Badge variant={a.source === "core" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                    {a.source === "core" ? "A2E" : "Bilan"}
                  </Badge>
                </motion.li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
