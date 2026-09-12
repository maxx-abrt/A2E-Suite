"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/glass-card"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"

interface Props {
  data: Cerfa15059Data
  onChange: (data: Cerfa15059Data) => void
}

export default function StepAnnex({ data, onChange }: Props) {
  const a = data.annex
  const hasIndirectCosts = data.financial.expenseRows.some(
    (r) => r.groupCode === "indirect" && r.realisation > 0,
  )
  const hasVoluntaryContributions = data.financial.expenseRows.some(
    (r) => r.groupCode === "86" && r.realisation > 0,
  ) || data.financial.incomeRows.some(
    (r) => r.groupCode === "87" && r.realisation > 0,
  )
  const hasSignificantVariance = data.financial.expenseRows.some(
    (r) => r.prevision > 0 && Math.abs(r.realisation - r.prevision) / r.prevision > 0.2,
  ) || data.financial.incomeRows.some(
    (r) => r.prevision > 0 && Math.abs(r.realisation - r.prevision) / r.prevision > 0.2,
  )

  function patchAnnex<K extends keyof Cerfa15059Data["annex"]>(
    key: K,
    value: Cerfa15059Data["annex"][K],
  ) {
    const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
    next.annex[key] = value
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {hasIndirectCosts && (
        <GlassCard className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Répartition des charges indirectes</h2>
          <Label>Règles de répartition des charges indirectes affectées à l'action subventionnée</Label>
          <Textarea
            value={a.allocationRulesIndirectCosts || ""}
            onChange={(e) => patchAnnex("allocationRulesIndirectCosts", e.target.value || undefined)}
            rows={5}
            placeholder="Décrivez la méthode de répartition (clés de répartition, pourcentages, etc.)"
          />
        </GlassCard>
      )}

      {hasSignificantVariance && (
        <GlassCard className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Écarts significatifs</h2>
          <Label>Explication et justification des écarts significatifs entre le budget prévisionnel et le budget final exécuté</Label>
          <Textarea
            value={a.significantVarianceExplanation || ""}
            onChange={(e) => patchAnnex("significantVarianceExplanation", e.target.value || undefined)}
            rows={5}
            placeholder="Justifiez les écarts supérieurs à 20% entre prévision et réalisation"
          />
        </GlassCard>
      )}

      {hasVoluntaryContributions && (
        <GlassCard className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Contributions volontaires en nature</h2>
          <Label>Détail des contributions volontaires en nature affectées à la réalisation du projet</Label>
          <Textarea
            value={a.voluntaryContributionsDetails || ""}
            onChange={(e) => patchAnnex("voluntaryContributionsDetails", e.target.value || undefined)}
            rows={5}
            placeholder="Nature, valeur estimée et bénéficiaires des contributions en nature"
          />
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">Observations complémentaires</h2>
        <Label>Observations sur le compte-rendu financier de l'opération subventionnée</Label>
        <Textarea
          value={a.additionalObservations || ""}
          onChange={(e) => patchAnnex("additionalObservations", e.target.value || undefined)}
          rows={5}
          placeholder="Toute observation utile pour l'autorité administrative (facultatif)"
        />
      </GlassCard>
    </div>
  )
}
