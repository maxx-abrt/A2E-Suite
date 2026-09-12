"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/glass-card"
import { cn } from "@/lib/utils"
import { Plus, Trash } from "@/components/iconsax"
import {
  amountInFrenchWords,
  RECU_DON_CATEGORIES,
  FORME_LABELS,
  NATURE_LABELS,
  MODE_LABELS,
} from "@/lib/documents/recu-don"
import { budgetTotals } from "@/lib/documents/budget-equilibre"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useWorkspace } from "@/lib/workspace-context"
import { toast } from "sonner"
import { Buildings } from "@/components/iconsax"

/** Loads the workspace org profile and offers a one-click prefill button. */
function OrgImportBar({ onImport }: { onImport: (org: any) => void }) {
  const { activeWorkspace } = useWorkspace()
  const org = useQuery(
    api.a2e_org.get,
    activeWorkspace?._id ? { workspaceId: activeWorkspace._id } : "skip",
  )
  if (!org) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Buildings size={16} variant="Bulk" className="text-primary" />
        Profil de l'organisation disponible ({org.legalName || org.shortName || "sans nom"})
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          onImport(org)
          toast.success("Profil importé")
        }}
        data-testid="org-import-btn"
      >
        Pré-remplir depuis le profil
      </Button>
    </div>
  )
}

function Section({
  number,
  title,
  hint,
  children,
}: {
  number: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {number}
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </GlassCard>
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

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm transition-colors hover:bg-muted/50">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 accent-[var(--primary)]"
      />
      <span>{label}</span>
    </label>
  )
}

/* ============================ REÇU DE DONS ============================ */
export function RecuDonEditor({
  data,
  onChange,
}: {
  data: any
  onChange: (next: any) => void
}) {
  const set = (path: string, value: any) => {
    const next = JSON.parse(JSON.stringify(data ?? {}))
    const parts = path.split(".")
    let cur = next
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = {}
      cur = cur[parts[i]]
    }
    cur[parts[parts.length - 1]] = value
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <Section number={1} title="Bénéficiaire du don" hint="L'organisme qui reçoit le don">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="N° du reçu">
            <Input value={data.receiptNumber ?? ""} onChange={(e) => set("receiptNumber", e.target.value)} placeholder="2026-001" />
          </Field>
          <Field label="Dénomination de l'organisme">
            <Input value={data.orgName ?? ""} onChange={(e) => set("orgName", e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse complète">
          <Input value={data.orgAddress ?? ""} onChange={(e) => set("orgAddress", e.target.value)} />
        </Field>
        <Field label="Objet de l'organisme">
          <Input value={data.orgObject ?? ""} onChange={(e) => set("orgObject", e.target.value)} />
        </Field>
        <Field label="Catégorie de l'organisme">
          <select
            value={data.orgCategory ?? ""}
            onChange={(e) => set("orgCategory", e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {RECU_DON_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Régime fiscal applicable">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Check label="Art. 200 CGI (impôt sur le revenu)" checked={!!data.regime?.art200} onChange={(v) => set("regime.art200", v)} />
            <Check label="Art. 238 bis CGI (entreprises)" checked={!!data.regime?.art238bis} onChange={(v) => set("regime.art238bis", v)} />
            <Check label="Art. 978 CGI (IFI)" checked={!!data.regime?.art978} onChange={(v) => set("regime.art978", v)} />
          </div>
        </Field>
      </Section>

      <Section number={2} title="Donateur">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Civilité / forme">
            <Input value={data.donorCivility ?? ""} onChange={(e) => set("donorCivility", e.target.value)} placeholder="M., Mme, Société…" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Nom et prénom (ou raison sociale)">
              <Input value={data.donorName ?? ""} onChange={(e) => set("donorName", e.target.value)} />
            </Field>
          </div>
        </div>
        <Field label="Adresse du donateur">
          <Input value={data.donorAddress ?? ""} onChange={(e) => set("donorAddress", e.target.value)} />
        </Field>
      </Section>

      <Section number={3} title="Don">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Montant (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={data.amount ?? 0}
              onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Date du versement">
            <Input type="date" value={data.donDate ?? ""} onChange={(e) => set("donDate", e.target.value)} />
          </Field>
        </div>
        {data.amount > 0 ? (
          <div className="rounded-lg bg-brand-purple-soft px-3 py-2 text-sm">
            <span className="text-muted-foreground">Montant en lettres : </span>
            <span className="font-medium text-primary">{amountInFrenchWords(Number(data.amount) || 0)}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Forme du don">
            <div className="flex flex-col gap-1.5">
              {(Object.keys(FORME_LABELS) as Array<keyof typeof FORME_LABELS>).map((k) => (
                <Pill key={k} active={data.forme === k} onClick={() => set("forme", k)}>{FORME_LABELS[k]}</Pill>
              ))}
            </div>
          </Field>
          <Field label="Nature du don">
            <div className="flex flex-col gap-1.5">
              {(Object.keys(NATURE_LABELS) as Array<keyof typeof NATURE_LABELS>).map((k) => (
                <Pill key={k} active={data.nature === k} onClick={() => set("nature", k)}>{NATURE_LABELS[k]}</Pill>
              ))}
            </div>
          </Field>
          <Field label="Mode de versement">
            <div className="flex flex-col gap-1.5">
              {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map((k) => (
                <Pill key={k} active={data.modeVersement === k} onClick={() => set("modeVersement", k)}>{MODE_LABELS[k]}</Pill>
              ))}
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Check label="Abandon de revenus ou de produits" checked={!!data.abandonRevenus} onChange={(v) => set("abandonRevenus", v)} />
          <Check label="Frais engagés par les bénévoles (renoncement au remboursement)" checked={!!data.fraisBenevoles} onChange={(v) => set("fraisBenevoles", v)} />
        </div>
      </Section>

      <Section number={4} title="Signature">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom du signataire">
            <Input value={data.signatoryName ?? ""} onChange={(e) => set("signatoryName", e.target.value)} />
          </Field>
          <Field label="Qualité">
            <Input value={data.signatoryQuality ?? ""} onChange={(e) => set("signatoryQuality", e.target.value)} placeholder="Président(e), Trésorier(ère)…" />
          </Field>
          <Field label="Fait à">
            <Input value={data.signatureCity ?? ""} onChange={(e) => set("signatureCity", e.target.value)} />
          </Field>
          <Field label="Le">
            <Input type="date" value={data.signatureDate ?? ""} onChange={(e) => set("signatureDate", e.target.value)} />
          </Field>
        </div>
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Rappel légal : la délivrance irrégulière de reçus fiscaux est sanctionnée par une amende (art. 1740 A du CGI). Le reçu doit être conservé par le donateur.
        </p>
      </Section>
    </div>
  )
}

/* ============================ BUDGET À L'ÉQUILIBRE ============================ */
export function BudgetEditor({
  data,
  onChange,
}: {
  data: any
  onChange: (next: any) => void
}) {
  const totals = budgetTotals(data)
  const set = (path: string, value: any) => {
    const next = JSON.parse(JSON.stringify(data ?? {}))
    next[path] = value
    onChange(next)
  }
  const setLine = (side: "charges" | "produits", idx: number, key: "label" | "amount", value: any) => {
    const next = JSON.parse(JSON.stringify(data ?? {}))
    if (!Array.isArray(next[side])) next[side] = []
    next[side][idx] = { ...(next[side][idx] || {}), [key]: key === "amount" ? parseFloat(value) || 0 : value }
    onChange(next)
  }
  const addLine = (side: "charges" | "produits") => {
    const next = JSON.parse(JSON.stringify(data ?? {}))
    if (!Array.isArray(next[side])) next[side] = []
    next[side].push({ label: "", amount: 0 })
    onChange(next)
  }
  const removeLine = (side: "charges" | "produits", idx: number) => {
    const next = JSON.parse(JSON.stringify(data ?? {}))
    next[side] = (next[side] || []).filter((_: any, i: number) => i !== idx)
    onChange(next)
  }

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0)
    } catch {
      return (n || 0).toFixed(2) + " €"
    }
  }

  const Column = ({ side, color }: { side: "charges" | "produits"; color: string }) => (
    <GlassCard className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>
          {side === "charges" ? "Charges (dépenses)" : "Produits (recettes)"}
        </h3>
        <span className="text-sm font-bold">{fmt(side === "charges" ? totals.totalCharges : totals.totalProduits)}</span>
      </div>
      <div className="space-y-2">
        {(data[side] ?? []).map((l: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={l.label ?? ""}
              onChange={(e) => setLine(side, i, "label", e.target.value)}
              className="flex-1 text-sm"
              placeholder="Libellé / compte"
            />
            <Input
              type="number"
              step="0.01"
              value={l.amount ?? 0}
              onChange={(e) => setLine(side, i, "amount", e.target.value)}
              className="w-28 text-right text-sm"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(side, i)}>
              <Trash className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addLine(side)}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
        </Button>
      </div>
    </GlassCard>
  )

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Association / structure">
            <Input value={data.association ?? ""} onChange={(e) => set("association", e.target.value)} />
          </Field>
          <Field label="Intitulé du budget">
            <Input value={data.scope ?? ""} onChange={(e) => set("scope", e.target.value)} placeholder="Budget annuel, Action X…" />
          </Field>
          <Field label="Exercice / année">
            <Input value={data.year ?? ""} onChange={(e) => set("year", e.target.value)} />
          </Field>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Column side="charges" color="var(--brand-purple)" />
        <Column side="produits" color="var(--success)" />
      </div>

      <GlassCard
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 p-5",
          totals.balanced ? "ring-1 ring-success/40" : "ring-1 ring-destructive/40",
        )}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Total charges : <b className="text-foreground">{fmt(totals.totalCharges)}</b></span>
          <span className="text-muted-foreground">Total produits : <b className="text-foreground">{fmt(totals.totalProduits)}</b></span>
        </div>
        <div
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold",
            totals.balanced ? "bg-brand-green-soft text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {totals.balanced
            ? "✓ Budget équilibré"
            : `Écart : ${fmt(Math.abs(totals.balance))} ${totals.balance > 0 ? "(excédent)" : "(déficit)"}`}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <Field label="Notes & hypothèses">
          <Textarea rows={4} value={data.notes ?? ""} onChange={(e) => set("notes", e.target.value)} className="resize-none" />
        </Field>
      </GlassCard>
    </div>
  )
}

/* ============================ shared helpers for legal docs ============================ */
function deepSet(data: any, path: string, value: any) {
  const next = JSON.parse(JSON.stringify(data ?? {}))
  const parts = path.split(".")
  let cur = next
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null) cur[parts[i]] = {}
    cur = cur[parts[i]]
  }
  cur[parts[parts.length - 1]] = value
  return next
}

function TextField({ label, value, onChange, placeholder, type }: any) {
  return (
    <Field label={label}>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)} placeholder={placeholder} />
    </Field>
  )
}

function AreaField({ label, value, onChange, rows = 3, placeholder }: any) {
  return (
    <Field label={label}>
      <Textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="resize-none" />
    </Field>
  )
}

/** Compact two-column charges/produits editor reused inside documents. */
function MiniBudget({ data, set }: { data: any; set: (path: string, v: any) => void }) {
  const totals = budgetTotals(data)
  const fmt = (n: number) => { try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0) } catch { return (n || 0).toFixed(2) + " €" } }
  const setLine = (side: "charges" | "produits", i: number, key: string, val: any) => {
    const arr = JSON.parse(JSON.stringify(data[side] || []))
    arr[i] = { ...(arr[i] || {}), [key]: key === "amount" ? parseFloat(val) || 0 : val }
    set(side, arr)
  }
  const add = (side: "charges" | "produits") => set(side, [...(data[side] || []), { label: "", amount: 0 }])
  const del = (side: "charges" | "produits", i: number) => set(side, (data[side] || []).filter((_: any, idx: number) => idx !== i))
  const Col = ({ side, color, title }: any) => (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{title}</span>
        <span className="text-xs font-bold">{fmt(side === "charges" ? totals.totalCharges : totals.totalProduits)}</span>
      </div>
      <div className="space-y-1.5">
        {(data[side] || []).map((l: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input value={l.label ?? ""} onChange={(e) => setLine(side, i, "label", e.target.value)} className="h-8 flex-1 text-xs" placeholder="Compte / libellé" />
            <Input type="number" step="0.01" value={l.amount ?? 0} onChange={(e) => setLine(side, i, "amount", e.target.value)} className="h-8 w-24 text-right text-xs" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del(side, i)}><Trash className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => add(side)}><Plus className="h-3 w-3" /> Ligne</Button>
      </div>
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Col side="charges" color="var(--brand-purple)" title="Charges" />
        <Col side="produits" color="var(--success)" title="Produits" />
      </div>
      <div className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", totals.balanced ? "bg-brand-green-soft text-success" : "bg-destructive/10 text-destructive")}>
        {totals.balanced ? "✓ Budget équilibré" : `Écart : ${fmt(Math.abs(totals.balance))} ${totals.balance > 0 ? "(excédent)" : "(déficit)"}`}
      </div>
    </div>
  )
}

/* ============================ DEMANDE DE SUBVENTION (CERFA 12156) ============================ */
export function DemandeSubventionEditor({ data, onChange }: { data: any; onChange: (n: any) => void }) {
  const set = (path: string, value: any) => onChange(deepSet(data, path, value))
  return (
    <div className="space-y-4">
      <OrgImportBar onImport={(o) => onChange({
        ...data,
        legalName: o.legalName || data.legalName, rna: o.rna || data.rna, siret: o.siret || data.siret,
        address: o.address || data.address, postalCode: o.postalCode || data.postalCode, city: o.city || data.city,
        email: o.email || data.email, phone: o.phone || data.phone, website: o.website || data.website,
        representativeName: o.representativeName || data.representativeName,
        representativeRole: o.representativeRole || data.representativeRole,
        rupRecognized: o.rupRecognized ?? data.rupRecognized, fiscalRegime: o.fiscalRegime || data.fiscalRegime,
        signatoryName: o.representativeName || data.signatoryName, signatoryRole: o.representativeRole || data.signatoryRole,
        city_sig: undefined, signatureCity: o.city || data.signatureCity,
      })} />

      <Section number={1} title="Objet de la demande" hint="Type et montant sollicité">
        <div className="flex flex-wrap gap-2">
          <Pill active={data.requestType === "fonctionnement"} onClick={() => set("requestType", "fonctionnement")}>Fonctionnement</Pill>
          <Pill active={data.requestType === "projet"} onClick={() => set("requestType", "projet")}>Projet / action</Pill>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label="Montant sollicité (€)" type="number" value={data.amountRequested} onChange={(v: any) => set("amountRequested", v)} />
          <TextField label="Exercice / année" value={data.year} onChange={(v: any) => set("year", v)} />
          <TextField label="Autorité sollicitée" value={data.fundingBody} onChange={(v: any) => set("fundingBody", v)} placeholder="Mairie, Région, État…" />
        </div>
      </Section>

      <Section number={2} title="Identité de l'association">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Dénomination" value={data.legalName} onChange={(v: any) => set("legalName", v)} />
          <TextField label="N° RNA (W…)" value={data.rna} onChange={(v: any) => set("rna", v)} />
          <TextField label="N° SIRET" value={data.siret} onChange={(v: any) => set("siret", v)} />
          <TextField label="Site internet" value={data.website} onChange={(v: any) => set("website", v)} />
        </div>
        <TextField label="Adresse du siège" value={data.address} onChange={(v: any) => set("address", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <TextField label="Code postal" value={data.postalCode} onChange={(v: any) => set("postalCode", v)} />
          <div className="sm:col-span-3"><TextField label="Ville" value={data.city} onChange={(v: any) => set("city", v)} /></div>
          <TextField label="Courriel" value={data.email} onChange={(v: any) => set("email", v)} />
          <TextField label="Téléphone" value={data.phone} onChange={(v: any) => set("phone", v)} />
          <TextField label="Représentant légal" value={data.representativeName} onChange={(v: any) => set("representativeName", v)} />
          <TextField label="Qualité" value={data.representativeRole} onChange={(v: any) => set("representativeRole", v)} />
        </div>
      </Section>

      <Section number={3} title="Relations avec l'administration & moyens humains">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Agréments" value={data.agrements} onChange={(v: any) => set("agrements", v)} />
          <TextField label="Régime fiscal" value={data.fiscalRegime} onChange={(v: any) => set("fiscalRegime", v)} />
        </div>
        <Check label="Reconnue d'utilité publique (RUP)" checked={!!data.rupRecognized} onChange={(v) => set("rupRecognized", v)} />
        <AreaField label="Aides publiques reçues (3 derniers exercices)" rows={2} value={data.aidesPubliques3ans} onChange={(v: any) => set("aidesPubliques3ans", v)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TextField label="Adhérents" value={data.members} onChange={(v: any) => set("members", v)} />
          <TextField label="Bénévoles" value={data.volunteers} onChange={(v: any) => set("volunteers", v)} />
          <TextField label="Salariés" value={data.employees} onChange={(v: any) => set("employees", v)} />
          <TextField label="ETP" value={data.etp} onChange={(v: any) => set("etp", v)} />
        </div>
      </Section>

      <Section number={4} title="Budget prévisionnel global" hint="Doit être équilibré (charges = produits)">
        <MiniBudget data={data} set={set} />
      </Section>

      <Section number={5} title="Description du projet / de l'action">
        <TextField label="Intitulé" value={data.projectTitle} onChange={(v: any) => set("projectTitle", v)} />
        <AreaField label="Objectifs" value={data.objectives} onChange={(v: any) => set("objectives", v)} />
        <AreaField label="Description détaillée" rows={4} value={data.description} onChange={(v: any) => set("description", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label="Bénéficiaires" value={data.beneficiaries} onChange={(v: any) => set("beneficiaries", v)} />
          <TextField label="Territoire" value={data.territory} onChange={(v: any) => set("territory", v)} />
          <TextField label="Calendrier" value={data.calendar} onChange={(v: any) => set("calendar", v)} />
        </div>
        <AreaField label="Moyens mis en œuvre" rows={2} value={data.means} onChange={(v: any) => set("means", v)} />
        <AreaField label="Évaluation (indicateurs de réussite)" rows={2} value={data.evaluation} onChange={(v: any) => set("evaluation", v)} />
      </Section>

      <Section number={6} title="Attestation sur l'honneur & signature">
        <Check label="Je certifie l'exactitude des informations déclarées" checked={!!data.attestation} onChange={(v) => set("attestation", v)} />
        <Check label="L'association a souscrit au Contrat d'engagement républicain" checked={!!data.cerSigned} onChange={(v) => set("cerSigned", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Fait à" value={data.signatureCity} onChange={(v: any) => set("signatureCity", v)} />
          <TextField label="Le" type="date" value={data.signatureDate} onChange={(v: any) => set("signatureDate", v)} />
          <TextField label="Nom du signataire" value={data.signatoryName} onChange={(v: any) => set("signatoryName", v)} />
          <TextField label="Qualité" value={data.signatoryRole} onChange={(v: any) => set("signatoryRole", v)} />
        </div>
      </Section>
    </div>
  )
}

/* ============================ CONVENTION DE SUBVENTION ============================ */
export function ConventionEditor({ data, onChange }: { data: any; onChange: (n: any) => void }) {
  const set = (path: string, value: any) => onChange(deepSet(data, path, value))
  return (
    <div className="space-y-4">
      <OrgImportBar onImport={(o) => onChange({
        ...data,
        legalName: o.legalName || data.legalName, rna: o.rna || data.rna, siret: o.siret || data.siret,
        address: o.address || data.address,
        representativeName: o.representativeName || data.representativeName,
        representativeRole: o.representativeRole || data.representativeRole,
        signatureCity: o.city || data.signatureCity,
      })} />
      <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Convention obligatoire dès que le total annuel versé par un même financeur public dépasse 23 000 € (décret n°2001-495).
      </div>

      <Section number={1} title="Le financeur (collectivité / établissement public)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Nom du financeur" value={data.financeur} onChange={(v: any) => set("financeur", v)} />
          <TextField label="Référence de la convention" value={data.reference} onChange={(v: any) => set("reference", v)} />
          <TextField label="Représenté par" value={data.financeurRep} onChange={(v: any) => set("financeurRep", v)} />
          <TextField label="Qualité" value={data.financeurRole} onChange={(v: any) => set("financeurRole", v)} placeholder="Le Maire, Le Président…" />
        </div>
        <TextField label="Adresse du financeur" value={data.financeurAddress} onChange={(v: any) => set("financeurAddress", v)} />
      </Section>

      <Section number={2} title="Le bénéficiaire (association)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Dénomination" value={data.legalName} onChange={(v: any) => set("legalName", v)} />
          <TextField label="Représenté par" value={data.representativeName} onChange={(v: any) => set("representativeName", v)} />
          <TextField label="Qualité" value={data.representativeRole} onChange={(v: any) => set("representativeRole", v)} />
          <TextField label="N° RNA" value={data.rna} onChange={(v: any) => set("rna", v)} />
          <TextField label="N° SIRET" value={data.siret} onChange={(v: any) => set("siret", v)} />
          <TextField label="Adresse du siège" value={data.address} onChange={(v: any) => set("address", v)} />
        </div>
      </Section>

      <Section number={3} title="Objet & montant">
        <AreaField label="Objet de la subvention" rows={2} value={data.objet} onChange={(v: any) => set("objet", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Montant (€)" type="number" value={data.amount} onChange={(v: any) => set("amount", v)} />
          <TextField label="Exercice" value={data.exercice} onChange={(v: any) => set("exercice", v)} />
        </div>
        <AreaField label="Affectation / précisions" rows={2} value={data.affectation} onChange={(v: any) => set("affectation", v)} />
      </Section>

      <Section number={4} title="Modalités">
        <AreaField label="Modalités de versement (Article 3)" rows={2} value={data.paymentTerms} onChange={(v: any) => set("paymentTerms", v)} />
        <AreaField label="Durée (Article 6)" rows={2} value={data.duration} onChange={(v: any) => set("duration", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Fait à" value={data.signatureCity} onChange={(v: any) => set("signatureCity", v)} />
          <TextField label="Le" type="date" value={data.signatureDate} onChange={(v: any) => set("signatureDate", v)} />
        </div>
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Les articles 4 (obligations : compte rendu financier CERFA 15059 sous 6 mois), 5 (contrôle) et 7 (résiliation) sont générés automatiquement.
        </p>
      </Section>
    </div>
  )
}

/* ============================ RAPPORT D'ACTIVITÉ ============================ */
export function RapportActiviteEditor({ data, onChange }: { data: any; onChange: (n: any) => void }) {
  const set = (path: string, value: any) => onChange(deepSet(data, path, value))
  const setAct = (i: number, key: string, val: string) => {
    const arr = JSON.parse(JSON.stringify(data.activities || []))
    arr[i] = { ...(arr[i] || {}), [key]: val }
    set("activities", arr)
  }
  return (
    <div className="space-y-4">
      <OrgImportBar onImport={(o) => onChange({
        ...data,
        legalName: o.legalName || data.legalName,
        signatoryName: o.representativeName || data.signatoryName,
        signatoryRole: o.representativeRole || data.signatoryRole,
        signatureCity: o.city || data.signatureCity,
      })} />
      <Section number={1} title="En-tête">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Association" value={data.legalName} onChange={(v: any) => set("legalName", v)} />
          <TextField label="Exercice / année" value={data.year} onChange={(v: any) => set("year", v)} />
        </div>
        <AreaField label="Le mot du/de la président(e)" rows={3} value={data.presidentWord} onChange={(v: any) => set("presidentWord", v)} />
      </Section>

      <Section number={2} title="Vie associative">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextField label="Adhérents" value={data.members} onChange={(v: any) => set("members", v)} />
          <TextField label="Bénévoles" value={data.volunteers} onChange={(v: any) => set("volunteers", v)} />
          <TextField label="Salariés" value={data.employees} onChange={(v: any) => set("employees", v)} />
        </div>
        <AreaField label="Gouvernance (bureau / CA)" rows={2} value={data.governance} onChange={(v: any) => set("governance", v)} />
      </Section>

      <Section number={3} title="Actions menées">
        <div className="space-y-3">
          {(data.activities || []).map((a: any, i: number) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Action {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => set("activities", (data.activities || []).filter((_: any, idx: number) => idx !== i))}>Retirer</Button>
              </div>
              <TextField label="Titre" value={a.title} onChange={(v: any) => setAct(i, "title", v)} />
              <div className="mt-2"><AreaField label="Description" rows={2} value={a.description} onChange={(v: any) => setAct(i, "description", v)} /></div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <TextField label="Bénéficiaires" value={a.beneficiaries} onChange={(v: any) => setAct(i, "beneficiaries", v)} />
                <TextField label="Période" value={a.period} onChange={(v: any) => setAct(i, "period", v)} />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set("activities", [...(data.activities || []), { title: "", description: "", beneficiaries: "", period: "" }])}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une action
          </Button>
        </div>
      </Section>

      <Section number={4} title="Bilan & perspectives">
        <AreaField label="Bilan qualitatif & résultats" rows={3} value={data.results} onChange={(v: any) => set("results", v)} />
        <AreaField label="Synthèse financière" rows={2} value={data.financialSummary} onChange={(v: any) => set("financialSummary", v)} />
        <AreaField label="Perspectives" rows={2} value={data.perspectives} onChange={(v: any) => set("perspectives", v)} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Fait à" value={data.signatureCity} onChange={(v: any) => set("signatureCity", v)} />
          <TextField label="Le" type="date" value={data.signatureDate} onChange={(v: any) => set("signatureDate", v)} />
          <TextField label="Signataire" value={data.signatoryName} onChange={(v: any) => set("signatoryName", v)} />
          <TextField label="Qualité" value={data.signatoryRole} onChange={(v: any) => set("signatoryRole", v)} />
        </div>
      </Section>
    </div>
  )
}

/* ============================ ATTESTATION SUR L'HONNEUR ============================ */
export function AttestationEditor({ data, onChange }: { data: any; onChange: (n: any) => void }) {
  const set = (path: string, value: any) => onChange(deepSet(data, path, value))
  return (
    <div className="space-y-4">
      <OrgImportBar onImport={(o) => onChange({
        ...data,
        legalName: o.legalName || data.legalName, rna: o.rna || data.rna, siret: o.siret || data.siret,
        address: o.address || data.address,
        representativeName: o.representativeName || data.representativeName,
        representativeRole: o.representativeRole || data.representativeRole,
        signatureCity: o.city || data.signatureCity,
      })} />
      <Section number={1} title="Signataire & organisation">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Représentant légal" value={data.representativeName} onChange={(v: any) => set("representativeName", v)} />
          <TextField label="Qualité" value={data.representativeRole} onChange={(v: any) => set("representativeRole", v)} />
          <TextField label="Association" value={data.legalName} onChange={(v: any) => set("legalName", v)} />
          <TextField label="N° RNA" value={data.rna} onChange={(v: any) => set("rna", v)} />
          <TextField label="N° SIRET" value={data.siret} onChange={(v: any) => set("siret", v)} />
          <TextField label="Adresse du siège" value={data.address} onChange={(v: any) => set("address", v)} />
        </div>
      </Section>

      <Section number={2} title="Déclarations">
        <Check label="L'association est régulièrement déclarée et en règle (déclarations sociales et fiscales)" checked={!!data.decRegular} onChange={(v) => set("decRegular", v)} />
        <Check label="Exactitude et sincérité des informations transmises" checked={!!data.decExact} onChange={(v) => set("decExact", v)} />
        <Check label="À jour des obligations administratives, comptables, sociales et fiscales" checked={!!data.decObligations} onChange={(v) => set("decObligations", v)} />
        <Check label="A souscrit au Contrat d'engagement républicain" checked={!!data.decCer} onChange={(v) => set("decCer", v)} />
        <Check label="Ne procède à aucune distribution de bénéfices à ses membres" checked={!!data.decNoDistribution} onChange={(v) => set("decNoDistribution", v)} />
      </Section>

      <Section number={3} title="Contexte & signature">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="À l'appui d'une demande auprès de" value={data.fundingBody} onChange={(v: any) => set("fundingBody", v)} />
          <TextField label="Montant sollicité (€)" type="number" value={data.amountRequested} onChange={(v: any) => set("amountRequested", v)} />
          <TextField label="Fait à" value={data.signatureCity} onChange={(v: any) => set("signatureCity", v)} />
          <TextField label="Le" type="date" value={data.signatureDate} onChange={(v: any) => set("signatureDate", v)} />
        </div>
      </Section>
    </div>
  )
}
