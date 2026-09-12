"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/glass-card"
import { exportFicheToPdf } from "@/lib/fiche-pdf"
import { RecuDonEditor, BudgetEditor, DemandeSubventionEditor, ConventionEditor, RapportActiviteEditor, AttestationEditor } from "@/components/fiches/document-editors"
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Save,
  CheckCircle2,
} from "@/components/iconsax"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function FichePage() {
  const params = useParams<{ id: string }>()
  const ficheId = params?.id as Id<"a2e_fiches">
  const t = useTranslations("pages.fiches")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const router = useRouter()

  const fiche = useQuery(api.a2e_fiches.get, ficheId ? { ficheId } : "skip")
  const update = useMutation(api.a2e_fiches.update)

  const [localData, setLocalData] = React.useState<any>(null)
  const [title, setTitle] = React.useState("")
  const [saved, setSaved] = React.useState<"idle" | "saving" | "saved">("idle")
  const saveTimer = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (fiche) {
      setLocalData(fiche.data ?? {})
      setTitle(fiche.title)
    }
  }, [fiche?._id])

  function scheduleSave(nextData: any, nextTitle?: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaved("saving")
    saveTimer.current = setTimeout(async () => {
      try {
        await update({
          ficheId,
          data: nextData,
          title: nextTitle ?? title,
        })
        setSaved("saved")
        setTimeout(() => setSaved("idle"), 1500)
      } catch {
        setSaved("idle")
      }
    }, 600)
  }

  function patch(path: string, value: any) {
    setLocalData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev ?? {}))
      const parts = path.split(".")
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {}
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = value
      scheduleSave(next)
      return next
    })
  }

  function patchArray(field: string, idx: number, val: any) {
    setLocalData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev ?? {}))
      if (!Array.isArray(next[field])) next[field] = []
      next[field][idx] = val
      scheduleSave(next)
      return next
    })
  }

  function patchActionsItem(idx: number, key: string, val: string) {
    setLocalData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev ?? {}))
      if (!Array.isArray(next.actions)) next.actions = []
      next.actions[idx] = { ...(next.actions[idx] || {}), [key]: val }
      scheduleSave(next)
      return next
    })
  }

  function addAction() {
    setLocalData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev ?? {}))
      if (!Array.isArray(next.actions)) next.actions = []
      next.actions.push({ description: "", audience: "", frequency: "", period: "" })
      scheduleSave(next)
      return next
    })
  }

  function removeAction(idx: number) {
    setLocalData((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev ?? {}))
      next.actions = (next.actions || []).filter((_: any, i: number) => i !== idx)
      scheduleSave(next)
      return next
    })
  }

  async function handleExport(blank: boolean) {
    if (!fiche) return
    await exportFicheToPdf({
      template: fiche.template,
      title: title || fiche.title,
      data: blank ? null : localData,
      locale,
    })
    toast.success(blank ? t("exportBlankPdf") : t("exportFilledPdf"))
  }

  if (!fiche || !localData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/fiches"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              scheduleSave(localData, e.target.value)
            }}
            className="max-w-md flex-1 border-none bg-transparent text-xl font-semibold shadow-none focus-visible:ring-1"
            placeholder={t("fields.ficheTitle")}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saved === "saving" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("saving")}</>
            ) : saved === "saved" ? (
              <><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("saved")}</>
            ) : null}
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => handleExport(true)} className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> {t("exportBlankPdf")}
            </Button>
            <Button onClick={() => handleExport(false)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t("exportFilledPdf")}
            </Button>
          </div>
        </div>

        {fiche.template === "asso_fr" ? (
          <FicheAssoEditor data={localData} patch={patch} patchArray={patchArray} patchActionsItem={patchActionsItem} addAction={addAction} removeAction={removeAction} />
        ) : fiche.template === "recu_don" ? (
          <RecuDonEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : fiche.template === "budget_equilibre" ? (
          <BudgetEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : fiche.template === "demande_subvention" ? (
          <DemandeSubventionEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : fiche.template === "convention_subvention" ? (
          <ConventionEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : fiche.template === "rapport_activite" ? (
          <RapportActiviteEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : fiche.template === "attestation_honneur" ? (
          <AttestationEditor data={localData} onChange={(next) => { setLocalData(next); scheduleSave(next) }} />
        ) : (
          <GlassCard className="p-6">
            <Label>{t("fields.subtitle")}</Label>
            <Textarea
              value={localData.content ?? ""}
              onChange={(e) => patch("content", e.target.value)}
              rows={20}
              className="mt-2 resize-none"
              placeholder="Free-form notes…"
            />
          </GlassCard>
        )}
      </div>
    </div>
  )
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-primary">
          {number}
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </GlassCard>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-foreground" />
      <span>{label}</span>
    </label>
  )
}

function FicheAssoEditor({
  data,
  patch,
  patchArray,
  patchActionsItem,
  addAction,
  removeAction,
}: {
  data: any
  patch: (path: string, value: any) => void
  patchArray: (field: string, idx: number, val: any) => void
  patchActionsItem: (idx: number, key: string, val: string) => void
  addAction: () => void
  removeAction: (idx: number) => void
}) {
  const t = useTranslations("pages.fiches.fields")
  return (
    <div className="space-y-4">
      {/* 1. Identity */}
      <Section number={1} title="Identité du projet">
        <Field label={t("ficheTitle")}>
          <Input value={data.ficheTitle ?? ""} onChange={(e) => patch("ficheTitle", e.target.value)} />
        </Field>
        <Field label={t("thematic")}>
          <div className="flex flex-wrap gap-2">
            {(["culture", "sport", "social", "education", "other"] as const).map((th) => (
              <button
                type="button"
                key={th}
                onClick={() => patch("thematic", th)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  data.thematic === th ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                )}
              >
                {t(`thematics.${th}`)}
              </button>
            ))}
          </div>
          {data.thematic === "other" && (
            <Input className="mt-2" placeholder={t("thematics.other")} value={data.thematicOther ?? ""} onChange={(e) => patch("thematicOther", e.target.value)} />
          )}
        </Field>
        <Field label={t("association")}>
          <Input value={data.association ?? ""} onChange={(e) => patch("association", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("referent")}>
            <Input value={data.referent ?? ""} onChange={(e) => patch("referent", e.target.value)} />
          </Field>
          <Field label={t("phone")}>
            <Input value={data.phone ?? ""} onChange={(e) => patch("phone", e.target.value)} />
          </Field>
          <Field label={t("email")}>
            <Input type="email" value={data.email ?? ""} onChange={(e) => patch("email", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* 2. Context */}
      <Section number={2} title="Contexte & origine">
        <Field label={t("context")}>
          <Textarea rows={3} value={data.context ?? ""} onChange={(e) => patch("context", e.target.value)} />
        </Field>
        <Field label={t("origin")}>
          <Textarea rows={2} value={data.origin ?? ""} onChange={(e) => patch("origin", e.target.value)} />
        </Field>
        <Field label={t("linkToProject")}>
          <Textarea rows={2} value={data.linkToProject ?? ""} onChange={(e) => patch("linkToProject", e.target.value)} />
        </Field>
      </Section>

      {/* 3. Audience */}
      <Section number={3} title="Publics cibles & besoins">
        <Field label={t("audience")}>
          <Input value={data.audience ?? ""} onChange={(e) => patch("audience", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("ageProfile")}>
            <Input value={data.ageProfile ?? ""} onChange={(e) => patch("ageProfile", e.target.value)} />
          </Field>
          <Field label={t("estimatedParticipants")}>
            <Input value={data.estimatedParticipants ?? ""} onChange={(e) => patch("estimatedParticipants", e.target.value)} />
          </Field>
          <Field label={t("geographicArea")}>
            <Input value={data.geographicArea ?? ""} onChange={(e) => patch("geographicArea", e.target.value)} />
          </Field>
        </div>
        <Field label={t("identifiedNeeds")}>
          <div className="flex flex-wrap gap-2">
            {(["isolation", "economic", "culturalAccess", "educational", "other"] as const).map((k) => (
              <Check
                key={k}
                label={t(`needs.${k}`)}
                checked={!!data.needs?.[k]}
                onChange={(v) => patch(`needs.${k}`, v)}
              />
            ))}
          </div>
          {data.needs?.other && (
            <Input className="mt-2" placeholder={t("needs.other")} value={data.needsOther ?? ""} onChange={(e) => patch("needsOther", e.target.value)} />
          )}
        </Field>
      </Section>

      {/* 4. Objectives */}
      <Section number={4} title="Objectifs">
        <Field label={t("generalObjective")}>
          <Textarea rows={2} value={data.generalObjective ?? ""} onChange={(e) => patch("generalObjective", e.target.value)} />
        </Field>
        <Field label={t("specificObjectives")}>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Input
                key={i}
                placeholder={`#${i + 1}`}
                value={(data.specificObjectives ?? [])[i] ?? ""}
                onChange={(e) => patchArray("specificObjectives", i, e.target.value)}
              />
            ))}
          </div>
        </Field>
      </Section>

      {/* 5. Actions */}
      <Section number={5} title="Actions principales">
        <Field label={t("actionTypes")}>
          <div className="flex flex-wrap gap-2">
            {(["workshops", "event", "individualSupport", "awareness", "other"] as const).map((k) => (
              <Check key={k} label={t(`actions.${k}`)} checked={!!data.actionTypes?.[k]} onChange={(v) => patch(`actionTypes.${k}`, v)} />
            ))}
          </div>
          {data.actionTypes?.other && (
            <Input className="mt-2" placeholder={t("actions.other")} value={data.actionTypesOther ?? ""} onChange={(e) => patch("actionTypesOther", e.target.value)} />
          )}
        </Field>
        <div className="space-y-3">
          {(data.actions ?? []).map((a: any, idx: number) => (
            <div key={idx} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("action", { n: idx + 1 })}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeAction(idx)} className="h-7 text-destructive">{t("removeAction")}</Button>
              </div>
              <Field label={t("actionDescription")}>
                <Input value={a.description ?? ""} onChange={(e) => patchActionsItem(idx, "description", e.target.value)} />
              </Field>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Field label={t("audienceLabel")}>
                  <Input value={a.audience ?? ""} onChange={(e) => patchActionsItem(idx, "audience", e.target.value)} />
                </Field>
                <Field label={t("frequency")}>
                  <Input value={a.frequency ?? ""} onChange={(e) => patchActionsItem(idx, "frequency", e.target.value)} />
                </Field>
                <Field label={t("period")}>
                  <Input value={a.period ?? ""} onChange={(e) => patchActionsItem(idx, "period", e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addAction}>{t("addAction")}</Button>
        </div>
      </Section>

      {/* 6. Resources & partners */}
      <Section number={6} title="Moyens & partenaires">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t("volunteers")}>
            <Input value={data.volunteers ?? ""} onChange={(e) => patch("volunteers", e.target.value)} />
          </Field>
          <Field label={t("employees")}>
            <Input value={data.employees ?? ""} onChange={(e) => patch("employees", e.target.value)} />
          </Field>
          <Field label={t("externalContributors")}>
            <Input value={data.externalContributors ?? ""} onChange={(e) => patch("externalContributors", e.target.value)} />
          </Field>
        </div>
        <Field label={t("materialResources")}>
          <Textarea rows={2} value={data.materialResources ?? ""} onChange={(e) => patch("materialResources", e.target.value)} />
        </Field>
        <Field label={t("partners")}>
          <div className="flex flex-wrap gap-2">
            {(["localGov", "associations", "schools", "companies", "other"] as const).map((k) => (
              <Check key={k} label={t(`partnersOptions.${k}`)} checked={!!data.partners?.[k]} onChange={(v) => patch(`partners.${k}`, v)} />
            ))}
          </div>
          {data.partners?.other && (
            <Input className="mt-2" placeholder={t("partnersOptions.other")} value={data.partnersOther ?? ""} onChange={(e) => patch("partnersOther", e.target.value)} />
          )}
        </Field>
      </Section>

      {/* 7. Evaluation */}
      <Section number={7} title="Suivi, évaluation & perspectives">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("targetParticipants")}>
            <Input value={data.targetParticipants ?? ""} onChange={(e) => patch("targetParticipants", e.target.value)} />
          </Field>
          <Field label={t("targetAttendance")}>
            <Input value={data.targetAttendance ?? ""} onChange={(e) => patch("targetAttendance", e.target.value)} />
          </Field>
        </div>
        <Field label={t("qualitativeIndicators")}>
          <Textarea rows={2} value={data.qualitativeIndicators ?? ""} onChange={(e) => patch("qualitativeIndicators", e.target.value)} />
        </Field>
        <Field label={t("trackingTools")}>
          <div className="flex flex-wrap gap-2">
            {(["attendance", "satisfaction", "collective", "report", "other"] as const).map((k) => (
              <Check key={k} label={t(`trackingOptions.${k}`)} checked={!!data.trackingTools?.[k]} onChange={(v) => patch(`trackingTools.${k}`, v)} />
            ))}
          </div>
          {data.trackingTools?.other && (
            <Input className="mt-2" placeholder={t("trackingOptions.other")} value={data.trackingToolsOther ?? ""} onChange={(e) => patch("trackingToolsOther", e.target.value)} />
          )}
        </Field>
        <Field label={t("perspectives")}>
          <Textarea rows={2} value={data.perspectives ?? ""} onChange={(e) => patch("perspectives", e.target.value)} />
        </Field>
      </Section>

      {/* Signature */}
      <Section number={8} title="Signature">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("date")}>
            <Input type="date" value={data.date ?? ""} onChange={(e) => patch("date", e.target.value)} />
          </Field>
          <Field label={t("referentSignature")}>
            <Input value={data.referentSignature ?? ""} onChange={(e) => patch("referentSignature", e.target.value)} />
          </Field>
        </div>
        <Field label={t("boardOpinion")}>
          <div className="flex flex-wrap gap-2">
            {(["favorable", "reserved", "unfavorable"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => patch("boardOpinion", k)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  data.boardOpinion === k ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
                )}
              >
                {t(`opinions.${k}`)}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t("observations")}>
          <Textarea rows={2} value={data.observations ?? ""} onChange={(e) => patch("observations", e.target.value)} />
        </Field>
      </Section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}
