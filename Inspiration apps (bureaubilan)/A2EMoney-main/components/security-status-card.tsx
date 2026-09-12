"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { useTranslations } from "next-intl"
import { useWorkspace, useWorkspaceExport } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { GlassCard } from "@/components/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ShieldTick, CloseCircle, DocumentDownload, Trash, Danger, Lock, Global, Folder2 } from "@/components/iconsax"
import { exportToJSON } from "@/lib/export"
import { toast } from "sonner"
import Link from "next/link"

const CONSENT_VERSION = "2026-08-01"

function Line({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) {
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
 * "Sécurité & conformité" — the in-app, LIVE security panel. Everything shown is
 * computed server-side (`convex/security.ts`), so the UI can never over-promise:
 * if the encryption key were missing, this panel would say so.
 */
export function SecurityStatusCard() {
  const t = useTranslations("pages.settings.security")
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const posture = useQuery(
    api.security.posture,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {},
  )
  const bilanExport = useQuery(
    api.gdpr.exportWorkspace,
    activeWorkspaceId && (activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin")
      ? { workspaceId: activeWorkspaceId }
      : "skip",
  )
  const coreExport = useWorkspaceExport(
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin" ? activeWorkspaceId : null,
  )
  const myExport = useQuery(api.gdpr.exportMe, {})
  const consents = useQuery(api.gdpr.consents, {})
  const setConsent = useMutation(api.gdpr.setConsent)
  const eraseMe = useMutation(api.gdpr.eraseMe)
  const eraseWorkspace = useMutation(api.gdpr.eraseWorkspaceData)
  const [busy, setBusy] = React.useState(false)

  const analytics = consents?.find((c) => c.purpose === "analytics")?.granted ?? false
  const fields = posture?.encryption.fields ?? {}
  const encryptedFieldCount = Object.values(fields).reduce((n, list) => n + (list?.length ?? 0), 0)

  function downloadAll() {
    exportToJSON(`bilan-${activeWorkspace?.slug ?? "workspace"}-gdpr-export`, {
      generatedAt: new Date().toISOString(),
      subjectRequest: "GDPR art. 15 & 20 — access and portability",
      bilan: bilanExport ?? null,
      a2eCore: coreExport ?? null,
    })
    toast.success(t("exportDone"))
  }

  return (
    <GlassCard className="p-6" data-testid="security-status-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4 text-success" /> {t("title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Badge
          variant={posture?.encryption.enabled ? "secondary" : "outline"}
          className="gap-1 text-[10px]"
          data-testid="encryption-badge"
        >
          <ShieldTick className="h-3 w-3" />
          {posture?.encryption.enabled ? t("encryptionOn") : t("encryptionOff")}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
            <Lock className="h-3.5 w-3.5" /> {t("encryption")}
          </p>
          <Line label={t("algorithm")} value={posture?.encryption.algorithm ?? "—"} ok={posture?.encryption.enabled} />
          <Line label={t("kdf")} value={posture?.encryption.keyDerivation ?? "—"} />
          <Line label={t("binding")} value={posture?.encryption.contextBinding ?? "—"} />
          <Line label={t("keyLocation")} value={posture?.encryption.keyLocation ?? "—"} />
          <Line label={t("encryptedFields")} value={encryptedFieldCount} />
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
            <Global className="h-3.5 w-3.5" /> {t("residency")}
          </p>
          <Line label={t("appDb")} value={posture?.residency.appDatabase ?? "—"} ok />
          <Line label={t("sharedDb")} value={posture?.residency.sharedDatabase ?? "—"} ok />
          <Line label={t("filesStore")} value={posture?.residency.files ?? "—"} ok />
          <Line label={t("bucket")} value={posture?.storage.bucketPublic ? t("public") : t("private")} ok={!posture?.storage.bucketPublic} />
          <Line label={t("fileAccess")} value={posture?.storage.access ?? "—"} ok />
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium">
          <Folder2 className="h-3.5 w-3.5" /> {t("fieldsTitle")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(fields).flatMap(([table, list]) =>
            (list ?? []).map((field) => (
              <Badge key={`${table}.${field}`} variant="outline" className="font-mono text-[10px]">
                {table.replace("a2e_", "")}.{field}
              </Badge>
            )),
          )}
        </div>
      </div>

      <div className="mt-4">
        <Line
          label={t("auth")}
          value={`${posture?.auth.provider ?? "—"} · ${posture?.auth.tokens ?? ""}`}
          ok={Boolean(posture?.auth.provider)}
        />
        <Line label={t("bridge")} value={posture?.bridge.coreHost ?? "—"} ok={posture?.bridge.configured} />
      </div>

      {/* GDPR */}
      <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("gdpr")}</h3>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs">{t("analytics")}</Label>
            <p className="text-[11px] text-muted-foreground">{t("analyticsHint")}</p>
          </div>
          <Switch
            checked={analytics}
            data-testid="consent-analytics"
            onCheckedChange={async (next) => {
              await setConsent({ purpose: "analytics", granted: next, version: CONSENT_VERSION })
              toast.success(next ? t("consentGranted") : t("consentWithdrawn"))
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="gdpr-export-all"
            disabled={!bilanExport && !coreExport}
            onClick={downloadAll}
          >
            <DocumentDownload className="h-3.5 w-3.5" /> {t("exportAll")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="gdpr-export-me"
            disabled={!myExport}
            onClick={() => {
              exportToJSON("bilan-mes-donnees", myExport)
              toast.success(t("exportDone"))
            }}
          >
            <DocumentDownload className="h-3.5 w-3.5" /> {t("exportMe")}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm" className="gap-2">
            <Link href="/security">{t("trustCenter")}</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{t("retentionNotice")}</p>
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive"
            data-testid="gdpr-erase-me"
            disabled={busy}
            onClick={async () => {
              if (!confirm(t("confirmEraseMe"))) return
              setBusy(true)
              try {
                const res = await eraseMe({ confirm: "ERASE" })
                toast.success(t("erasedMe", { count: res.pseudonymisedActions }))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Trash className="h-3.5 w-3.5" /> {t("eraseMe")}
          </Button>
          {activeWorkspace?.role === "owner" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 text-destructive"
              data-testid="gdpr-erase-workspace"
              disabled={busy || !activeWorkspaceId}
              onClick={async () => {
                if (!activeWorkspaceId) return
                if (!confirm(t("confirmEraseWorkspace"))) return
                setBusy(true)
                try {
                  await eraseWorkspace({ workspaceId: activeWorkspaceId, confirm: "ERASE" })
                  toast.success(t("erasedWorkspace"))
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Danger className="h-3.5 w-3.5" /> {t("eraseWorkspace")}
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
