import { FinancialRow, Cerfa15059Data } from "./types"

export function roundEuro(value: number): number {
  return Math.round(value)
}

export function calcPercent(realisation: number, prevision: number): number {
  if (!prevision || prevision === 0) return 0
  return roundEuro((realisation / prevision) * 100)
}

export function calcGroupTotal(
  rows: FinancialRow[],
  groupCode: string,
  field: "prevision" | "realisation",
): number {
  return rows
    .filter((r) => r.groupCode === groupCode)
    .reduce((sum, r) => sum + (r[field] ?? 0), 0)
}

export function calcSideTotal(
  rows: FinancialRow[],
  side: "expense" | "income",
  field: "prevision" | "realisation",
): number {
  return rows
    .filter((r) => r.side === side)
    .reduce((sum, r) => sum + (r[field] ?? 0), 0)
}

export function calcGrantSharePercent(grantAmount: number, incomeTotal: number): number {
  if (!incomeTotal || incomeTotal === 0) return 0
  return roundEuro((grantAmount / incomeTotal) * 100)
}

/**
 * Recalculate percentages for all rows and the grant share.
 * Returns a new Cerfa15059Data object with updated values.
 */
export function recalcAll(data: Cerfa15059Data): Cerfa15059Data {
  const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))

  // Recalculate each row's percent
  next.financial.expenseRows = next.financial.expenseRows.map((r) => ({
    ...r,
    percent: calcPercent(r.realisation, r.prevision),
  }))
  next.financial.incomeRows = next.financial.incomeRows.map((r) => ({
    ...r,
    percent: calcPercent(r.realisation, r.prevision),
  }))

  // Recalculate grant share
  const incomeTotal = calcSideTotal(next.financial.incomeRows, "income", "realisation")
  next.financial.grantSharePercent = calcGrantSharePercent(next.financial.grantAmount, incomeTotal)

  return next
}

export function patchFinancialRow(
  data: Cerfa15059Data,
  side: "expense" | "income",
  code: string,
  field: "prevision" | "realisation",
  value: number,
): Cerfa15059Data {
  const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
  const rows = side === "expense" ? next.financial.expenseRows : next.financial.incomeRows
  const idx = rows.findIndex((r) => r.code === code)
  if (idx !== -1) {
    rows[idx][field] = roundEuro(value)
    rows[idx].percent = calcPercent(rows[idx].realisation, rows[idx].prevision)
  }
  const incomeTotal = calcSideTotal(next.financial.incomeRows, "income", "realisation")
  next.financial.grantSharePercent = calcGrantSharePercent(next.financial.grantAmount, incomeTotal)
  return next
}

export function patchGrantAmount(data: Cerfa15059Data, value: number): Cerfa15059Data {
  const next: Cerfa15059Data = JSON.parse(JSON.stringify(data))
  next.financial.grantAmount = roundEuro(value)
  const incomeTotal = calcSideTotal(next.financial.incomeRows, "income", "realisation")
  next.financial.grantSharePercent = calcGrantSharePercent(next.financial.grantAmount, incomeTotal)
  return next
}
