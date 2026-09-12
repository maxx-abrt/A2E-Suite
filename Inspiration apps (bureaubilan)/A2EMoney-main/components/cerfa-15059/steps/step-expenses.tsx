"use client"

import * as React from "react"
import { GlassCard } from "@/components/glass-card"
import { FinancialTable } from "@/components/cerfa-15059/financial-table"
import { Cerfa15059Data } from "@/lib/cerfa-15059/types"
import { patchFinancialRow } from "@/lib/cerfa-15059/calculations"

interface Props {
  data: Cerfa15059Data
  onChange: (data: Cerfa15059Data) => void
}

export default function StepExpenses({ data, onChange }: Props) {
  const year = data.financial.exerciseYear

  function handleRowChange(code: string, field: "prevision" | "realisation", value: number) {
    onChange(patchFinancialRow(data, "expense", code, field, value))
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider">Tableau des charges</h2>
            <p className="text-xs text-muted-foreground">Exercice {year}</p>
          </div>
          <input
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => {
              const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
              next.financial.exerciseYear = parseInt(e.target.value) || new Date().getFullYear()
              onChange(next)
            }}
            className="w-24 rounded-md border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <FinancialTable
          rows={data.financial.expenseRows}
          side="expense"
          onChange={handleRowChange}
        />
      </GlassCard>
    </div>
  )
}
