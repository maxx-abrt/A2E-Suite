"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { useCoreAuthState, useEntitlement, useWorkspace } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { coreFlags } from "@/lib/core-flags"
import { useCoreBridge, useIdentity } from "@/lib/core-bridge"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Refresh, ShieldTick, CloseCircle, Loader2 } from "@/components/iconsax"
import { formatBytes } from "@/lib/utils"
import { toast } from "sonner"

function Row({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-xs font-medium">
        {ok === true && <ShieldTick className="h-3.5 w-3.5 text-success" />}
        {ok === false && <CloseCircle className="h-3.5 w-3.5 text-destructive" />}
        {value}
      </span>
    </div>
  )
}

/**
 * "Espace partagé A2E" — makes the invisible shared layer debuggable in one
 * glance: core host, shared session, linked workspace id, membership mirror,
 * modules running on core, plan & quotas.
 */
export function CoreStatusCard() {
  const t = useTranslations("pages.settings.core")
  const { activeWorkspace, activeWorkspaceId, workspaces } = useWorkspace()
  const { isAuthenticated, isLoading } = useCoreAuthState()
  const status = useQuery(api.coreSync.status, {})
  const entitlement = useEntitlement(activeWorkspaceId)
  const bridge = useCoreBridge()
  const identity = useIdentity()

  const mirrored = status?.memberships?.find((m) => m.workspaceId === activeWorkspaceId)

  const modules = [
    ["workspaces", coreFlags.workspaces],
    ["members", coreFlags.members],
    ["drive", coreFlags.drive],
    ["notifications", coreFlags.notifications],
    ["activities", coreFlags.activities],
    ["contacts", coreFlags.contacts],
    ["tasks", coreFlags.tasks],
    ["search", coreFlags.search],
  ] as const

  return (
    <GlassCard className="p-6" data-testid="core-status-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldTick className="h-4 w-4 text-success" /> {t("title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid="core-resync"
          onClick={async () => {
            await bridge.resync()
            toast.success(t("resynced"))
          }}
        >
          {bridge.syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Refresh className="h-3.5 w-3.5" />}
          {t("resync")}
        </Button>
      </div>

      <div className="mt-4">
        <Row label={t("coreHost")} value={status?.coreHost || "—"} ok={Boolean(status?.configured)} />
        <Row
          label={t("session")}
          value={isLoading ? "…" : isAuthenticated ? t("connected") : t("notConnected")}
          ok={isAuthenticated}
        />
        <Row label={t("identity")} value={identity.email ?? identity.workosId ?? "—"} ok={Boolean(identity.email)} />
        <Row label={t("coreUser")} value={identity.coreUserId ?? "—"} ok={Boolean(identity.coreUserId)} />
        <Row
          label={t("linkedWorkspace")}
          value={activeWorkspace ? `${activeWorkspace.name} · ${activeWorkspaceId?.slice(0, 8)}…` : "—"}
          ok={Boolean(activeWorkspaceId)}
        />
        <Row
          label={t("membership")}
          value={mirrored ? `${mirrored.role} · ${new Date(mirrored.syncedAt).toLocaleTimeString()}` : t("notMirrored")}
          ok={Boolean(mirrored)}
        />
        <Row label={t("workspaceCount")} value={workspaces?.length ?? 0} />
        <Row
          label={t("plan")}
          value={
            entitlement
              ? `${entitlement.planKey} · ${formatBytes(entitlement.usage.storageUsed)} / ${
                  entitlement.limits.storageBytes < 0 ? "∞" : formatBytes(entitlement.limits.storageBytes)
                }`
              : "—"
          }
        />
        {bridge.error && <Row label={t("lastError")} value={bridge.error} ok={false} />}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium">{t("modules")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {modules.map(([name, on]) => (
            <Badge key={name} variant={on ? "secondary" : "outline"} className="text-[10px]">
              {name} {on ? "· core" : "· local"}
            </Badge>
          ))}
        </div>
        {coreFlags.degraded && <p className="mt-2 text-xs text-warning">{t("degraded")}</p>}
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium">{t("appAccess")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(entitlement?.appAccess ?? []).map((app) => (
            <Badge key={app} variant="outline" className="text-[10px] capitalize">
              {app}
            </Badge>
          ))}
          {(entitlement?.appAccess ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
        </div>
      </div>
    </GlassCard>
  )
}
