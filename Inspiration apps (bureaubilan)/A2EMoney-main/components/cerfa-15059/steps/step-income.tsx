"use client"

import * as React from "react"
import { GlassCard } from "@/components/glass-card"
import { FinancialTable } from "@/components/cerfa-15059/financial-table"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"
import { patchFinancialRow, patchGrantAmount } from "@/lib/cerfa-15059/calculations"

interface Props {
  data: Cerfa15059Data
  onChange: (data: Cerfa15059Data) => void
}

export default function StepIncome({ data, onChange }: Props) {
  function handleRowChange(code: string, field: "prevision" | "realisation", value: number) {
    onChange(patchFinancialRow(data, "income", code, field, value))
  }

  function handleGrantChange(value: number) {
    onChange(patchGrantAmount(data, value))
  }

  const incomeTotal = data.financial.incomeRows.reduce((s, r) => s + r.realisation, 0)
  const grantShare = incomeTotal ? Math.round((data.financial.grantAmount / incomeTotal) * 100) : 0

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Tableau des produits</h2>
          <p className="text-xs text-muted-foreground">Exercice {data.financial.exerciseYear}</p>
        </div>
        <FinancialTable
          rows={data.financial.incomeRows}
          side="income"
          onChange={handleRowChange}
          grantAmount={data.financial.grantAmount}
          onGrantAmountChange={handleGrantChange}
        />
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Synthèse subvention</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Total des produits réalisés</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{incomeTotal.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground">Montant de la subvention</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.financial.grantAmount.toLocaleString("fr-FR")} €</p>
          </div>
          <div className="rounded-lg border border-border bg-accent/10 p-4 text-center">
            <p className="text-xs text-muted-foreground">Part de la subvention</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">{grantShare}%</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
