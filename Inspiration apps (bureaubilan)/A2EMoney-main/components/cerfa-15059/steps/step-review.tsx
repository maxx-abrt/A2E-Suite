"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/glass-card"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"
import { calcSideTotal } from "@/lib/cerfa-15059/calculations"

interface Props {
  data: Cerfa15059Data
  onChange: (data: Cerfa15059Data) => void
}

export default function StepReview({ data, onChange }: Props) {
  const q = data.qualitative
  const s = data.signature
  const expenseTotal = calcSideTotal(data.financial.expenseRows, "expense", "realisation")
  const incomeTotal = calcSideTotal(data.financial.incomeRows, "income", "realisation")
  const grantShare = incomeTotal ? Math.round((data.financial.grantAmount / incomeTotal) * 100) : 0

  function patchSignature<K extends keyof Cerfa15059Data["signature"]>(
    key: K,
    value: Cerfa15059Data["signature"][K],
  ) {
    const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
    next.signature[key] = value
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Récapitulatif</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Association</p>
            <p className="font-medium">{q.associationName || "—"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">SIRET</p>
            <p className="font-medium">{q.siret || "—"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Exercice</p>
            <p className="font-medium">{data.financial.exerciseYear}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Bénéficiaires</p>
            <p className="font-medium">{q.beneficiariesCount || 0} personnes</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total charges réalisées</p>
            <p className="font-medium tabular-nums">{expenseTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Total produits réalisés</p>
            <p className="font-medium tabular-nums">{incomeTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="rounded-lg border border-border bg-accent/10 p-3 sm:col-span-2">
            <p className="text-xs text-muted-foreground">Subvention / Part dans les produits</p>
            <p className="font-semibold tabular-nums">
              {data.financial.grantAmount.toLocaleString("fr-FR")} € — {grantShare}% du total des produits
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider">Bloc de certification</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nom et prénom du signataire</Label>
            <Input value={s.signatoryFullName} onChange={(e) => patchSignature("signatoryFullName", e.target.value)} />
          </div>
          <div>
            <Label>Représentant(e) légal(e) de l'association</Label>
            <Input value={s.legalRepresentativeAssociationName} onChange={(e) => patchSignature("legalRepresentativeAssociationName", e.target.value)} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={s.signedOn} onChange={(e) => patchSignature("signedOn", e.target.value)} />
          </div>
          <div>
            <Label>Lieu</Label>
            <Input value={s.signedAt} onChange={(e) => patchSignature("signedAt", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Mention de signature (texte)</Label>
            <Textarea
              value={s.signature}
              onChange={(e) => patchSignature("signature", e.target.value)}
              rows={3}
              placeholder="Le signataire atteste sur l'honneur l'exactitude des informations fournies."
            />
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
