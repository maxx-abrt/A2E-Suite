"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { useWorkspace, useWorkspaceMutations } from "@a2e/core"
import { api } from "@/convex/_generated/api"
import { useIdentity } from "@/lib/core-bridge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/glass-card"
import { CoreStatusCard } from "@/components/core-status-card"
import { SecurityStatusCard } from "@/components/security-status-card"
import { LogoutCurve, Save2, Danger, ShieldTick, Buildings2 } from "@/components/iconsax"
import { toast } from "sonner"

/**
 * Settings — profile & workspace live in A2E Core, the organisation legal profile
 * and the security/GDPR controls are Bilan's own (encrypted at rest).
 */
export default function SettingsPage() {
  const t = useTranslations("pages.settings")
  const tCommon = useTranslations("common")
  const signOut = () => {
    window.location.href = "/session/signout"
  }
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const identity = useIdentity()
  const { update, updateProfile } = useWorkspaceMutations()
  const org = useQuery(api.a2e_org.get, activeWorkspaceId ? { workspaceId: activeWorkspaceId } : "skip")
  const upsertOrg = useMutation(api.a2e_org.upsert)

  const [name, setName] = React.useState("")
  const [wsName, setWsName] = React.useState("")
  const [wsDesc, setWsDesc] = React.useState("")
  const [wsCurrency, setWsCurrency] = React.useState("EUR")
  const [saving, setSaving] = React.useState(false)
  const [orgForm, setOrgForm] = React.useState({
    legalName: "",
    rna: "",
    siret: "",
    address: "",
    postalCode: "",
    city: "",
    email: "",
    phone: "",
    website: "",
    representativeName: "",
    representativeRole: "",
    iban: "",
    bic: "",
    objet: "",
  })

  React.useEffect(() => {
    if (identity.name) setName(identity.name)
  }, [identity.name])

  React.useEffect(() => {
    if (activeWorkspace) {
      setWsName(activeWorkspace.name)
      setWsDesc(activeWorkspace.description ?? "")
      setWsCurrency(activeWorkspace.currency ?? "EUR")
    }
  }, [activeWorkspace])

  React.useEffect(() => {
    if (org) {
      setOrgForm({
        legalName: org.legalName ?? "",
        rna: org.rna ?? "",
        siret: org.siret ?? "",
        address: org.address ?? "",
        postalCode: org.postalCode ?? "",
        city: org.city ?? "",
        email: org.email ?? "",
        phone: org.phone ?? "",
        website: org.website ?? "",
        representativeName: org.representativeName ?? "",
        representativeRole: org.representativeRole ?? "",
        iban: org.iban ?? "",
        bic: org.bic ?? "",
        objet: org.objet ?? "",
      })
    }
  }, [org])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      await updateProfile({ name })
      toast.success(t("toasts.profileSaved"))
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWorkspace(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId) return
    try {
      setSaving(true)
      await update({
        workspaceId: activeWorkspaceId,
        name: wsName,
        description: wsDesc || undefined,
        currency: wsCurrency,
      })
      toast.success(t("toasts.workspaceSaved"))
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!activeWorkspaceId) return
    try {
      setSaving(true)
      await upsertOrg({ workspaceId: activeWorkspaceId, ...orgForm })
      toast.success(t("toasts.orgSaved"))
    } catch (err: any) {
      toast.error(err?.message || t("toasts.failed"))
    } finally {
      setSaving(false)
    }
  }

  const orgField = (key: keyof typeof orgForm, label: string, sensitive = false) => (
    <div>
      <Label className="flex items-center gap-1.5">
        {label}
        {sensitive && <ShieldTick className="h-3 w-3 text-success" />}
      </Label>
      <Input
        data-testid={`org-${key}`}
        value={orgForm[key]}
        onChange={(e) => setOrgForm({ ...orgForm, [key]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>

        {/* Profile (shared identity) */}
        <GlassCard className="p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h2 className="text-sm font-semibold">{t("profile")}</h2>
            <div>
              <Label>{tCommon("name")}</Label>
              <Input data-testid="settings-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={identity.email ?? ""} disabled />
              <p className="mt-1 text-xs text-muted-foreground">{t("emailManagedByWorkOS")}</p>
            </div>
            <div className="flex justify-end">
              <Button data-testid="save-profile-btn" type="submit" disabled={saving} className="gap-2">
                <Save2 size={14} variant="Bulk" /> {tCommon("save")}
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* Workspace (shared) */}
        {activeWorkspace && (
          <GlassCard className="p-6">
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <h2 className="text-sm font-semibold">{t("workspace")}</h2>
              <div>
                <Label>{tCommon("name")}</Label>
                <Input data-testid="ws-name" value={wsName} onChange={(e) => setWsName(e.target.value)} required />
              </div>
              <div>
                <Label>{tCommon("description")}</Label>
                <Textarea value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>{tCommon("currency")}</Label>
                <select
                  value={wsCurrency}
                  onChange={(e) => setWsCurrency(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                  <option value="CHF">CHF</option>
                  <option value="CAD">CAD $</option>
                </select>
              </div>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t("workspaceShared")}</p>
              <div className="flex justify-end">
                <Button data-testid="save-workspace-btn" type="submit" disabled={saving} className="gap-2">
                  <Save2 size={14} variant="Bulk" /> {tCommon("save")}
                </Button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Organisation legal identity (Bilan, encrypted) */}
        {activeWorkspace && (
          <GlassCard className="p-6">
            <form onSubmit={handleSaveOrg} className="space-y-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Buildings2 size={16} variant="Bulk" /> {t("organisation")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("organisationDescription")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {orgField("legalName", t("org.legalName"))}
                {orgField("rna", t("org.rna"), true)}
                {orgField("siret", "SIRET", true)}
                {orgField("email", "Email", true)}
                {orgField("phone", t("org.phone"), true)}
                {orgField("website", t("org.website"))}
                {orgField("postalCode", t("org.postalCode"))}
                {orgField("city", t("org.city"))}
                {orgField("representativeName", t("org.representativeName"), true)}
                {orgField("representativeRole", t("org.representativeRole"))}
                {orgField("iban", "IBAN", true)}
                {orgField("bic", "BIC", true)}
              </div>
              <div>
                <Label>{t("org.address")}</Label>
                <Textarea
                  data-testid="org-address"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>{t("org.objet")}</Label>
                <Textarea
                  value={orgForm.objet}
                  onChange={(e) => setOrgForm({ ...orgForm, objet: e.target.value })}
                  rows={2}
                />
              </div>
              <p className="flex items-start gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-muted-foreground">
                <ShieldTick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {t("org.encryptedNotice")}
              </p>
              <div className="flex justify-end">
                <Button data-testid="save-org-btn" type="submit" disabled={saving} className="gap-2">
                  <Save2 size={14} variant="Bulk" /> {tCommon("save")}
                </Button>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Shared layer status */}
        <CoreStatusCard />

        {/* Security & GDPR */}
        <SecurityStatusCard />

        {activeWorkspace?.role === "owner" && (
          <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 backdrop-blur-xl">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <Danger size={16} variant="Bulk" /> {t("danger")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("dangerDescription")}</p>
            <p className="text-xs text-muted-foreground">{t("dangerCoreNotice")}</p>
          </div>
        )}

        <GlassCard className="p-6">
          <Button data-testid="signout-btn" variant="ghost" onClick={() => signOut()} className="gap-2 text-muted-foreground">
            <LogoutCurve size={14} variant="Bulk" /> {t("signOut")}
          </Button>
        </GlassCard>
      </div>
    </div>
  )
}
