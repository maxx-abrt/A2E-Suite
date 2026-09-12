"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FinancialRow, CERFA_EXPENSE_GROUPS, CERFA_INCOME_GROUPS } from "@/lib/cerfa-15059/types"
import { calcGroupTotal } from "@/lib/cerfa-15059/calculations"

interface FinancialTableProps {
  rows: FinancialRow[]
  side: "expense" | "income"
  onChange: (code: string, field: "prevision" | "realisation", value: number) => void
  grantAmount?: number
  onGrantAmountChange?: (value: number) => void
  readOnly?: boolean
}

export function FinancialTable({ rows, side, onChange, grantAmount, onGrantAmountChange, readOnly }: FinancialTableProps) {
  const groups = side === "expense" ? CERFA_EXPENSE_GROUPS : CERFA_INCOME_GROUPS
  const sideTotalPrevision = rows.reduce((s, r) => s + r.prevision, 0)
  const sideTotalRealisation = rows.reduce((s, r) => s + r.realisation, 0)
  const sideTotalPercent = sideTotalPrevision ? Math.round((sideTotalRealisation / sideTotalPrevision) * 100) : 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-4 text-left font-medium text-muted-foreground">{side === "expense" ? "Charges" : "Produits"}</th>
            <th className="w-32 py-2 px-2 text-right font-medium text-muted-foreground">Prévision (€)</th>
            <th className="w-32 py-2 px-2 text-right font-medium text-muted-foreground">Réalisation (€)</th>
            <th className="w-20 py-2 pl-2 text-right font-medium text-muted-foreground">%</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const groupRows = rows.filter((r) => r.groupCode === group.code)
            if (groupRows.length === 0) return null
            const groupPrevision = calcGroupTotal(rows, group.code, "prevision")
            const groupRealisation = calcGroupTotal(rows, group.code, "realisation")
            const groupPercent = groupPrevision ? Math.round((groupRealisation / groupPrevision) * 100) : 0
            return (
              <React.Fragment key={group.code}>
                <tr className="border-b border-border/60 bg-muted/40">
                  <td className="py-1.5 pr-4 pl-2 font-semibold">{group.label}</td>
                  <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{groupPrevision.toLocaleString("fr-FR")}</td>
                  <td className="py-1.5 px-2 text-right font-semibold tabular-nums">{groupRealisation.toLocaleString("fr-FR")}</td>
                  <td className="py-1.5 pl-2 text-right font-semibold tabular-nums">{groupPercent}%</td>
                </tr>
                {groupRows.map((row) => (
                  <tr key={row.code} className="border-b border-border/30 transition-colors hover:bg-muted/20">
                    <td className="py-2 pr-4 pl-6">{row.label}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.prevision || ""}
                        onChange={(e) => onChange(row.code, "prevision", parseInt(e.target.value) || 0)}
                        disabled={readOnly}
                        className={cn(
                          "w-full rounded-md border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          readOnly && "opacity-60 cursor-not-allowed",
                        )}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.realisation || ""}
                        onChange={(e) => onChange(row.code, "realisation", parseInt(e.target.value) || 0)}
                        disabled={readOnly}
                        className={cn(
                          "w-full rounded-md border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          readOnly && "opacity-60 cursor-not-allowed",
                        )}
                      />
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums text-muted-foreground">{row.percent}%</td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
          <tr className="border-t-2 border-border bg-muted/60 font-semibold">
            <td className="py-2 pr-4">TOTAL {side === "expense" ? "DES CHARGES" : "DES PRODUITS"}</td>
            <td className="py-2 px-2 text-right tabular-nums">{sideTotalPrevision.toLocaleString("fr-FR")}</td>
            <td className="py-2 px-2 text-right tabular-nums">{sideTotalRealisation.toLocaleString("fr-FR")}</td>
            <td className="py-2 pl-2 text-right tabular-nums">{sideTotalPercent}%</td>
          </tr>
        </tbody>
      </table>

      {side === "income" && onGrantAmountChange !== undefined && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card/60 p-4">
          <div className="flex-1">
            <label className="text-sm font-medium">Montant de la subvention (€)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={grantAmount || ""}
              onChange={(e) => onGrantAmountChange(parseInt(e.target.value) || 0)}
              disabled={readOnly}
              className={cn(
                "mt-1 block w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                readOnly && "opacity-60 cursor-not-allowed",
              )}
            />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Représente</p>
            <p className="text-lg font-semibold tabular-nums">
              {(() => {
                const pct = sideTotalRealisation ? Math.round(((grantAmount || 0) / sideTotalRealisation) * 100) : 0
                return `${pct}%`
              })()} du total des produits
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
