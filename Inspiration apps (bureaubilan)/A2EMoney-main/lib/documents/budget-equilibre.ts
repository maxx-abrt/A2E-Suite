"use client"

// Budget prévisionnel à l'équilibre — modèle associatif (plan comptable).
import { jsPDF } from "jspdf"

export interface BudgetLine {
  label: string
  amount: number
}

export interface BudgetData {
  association: string
  scope: string // ex: "Budget annuel 2026" ou "Action : Festival"
  year: string
  charges: BudgetLine[]
  produits: BudgetLine[]
  notes: string
}

export const BUDGET_DEFAULT: BudgetData = {
  association: "",
  scope: "Budget prévisionnel annuel",
  year: String(new Date().getFullYear()),
  charges: [
    { label: "60 — Achats (matières, fournitures)", amount: 0 },
    { label: "61 — Services extérieurs (locations, assurances)", amount: 0 },
    { label: "62 — Autres services extérieurs (honoraires, communication)", amount: 0 },
    { label: "63 — Impôts et taxes", amount: 0 },
    { label: "64 — Charges de personnel", amount: 0 },
    { label: "65 — Autres charges de gestion courante", amount: 0 },
  ],
  produits: [
    { label: "70 — Ventes / prestations", amount: 0 },
    { label: "74 — Subventions d'exploitation", amount: 0 },
    { label: "75 — Cotisations, dons et legs", amount: 0 },
    { label: "76 — Produits financiers", amount: 0 },
  ],
  notes: "",
}

export function budgetTotals(data: BudgetData) {
  const totalCharges = (data.charges || []).reduce((s, l) => s + (Number(l.amount) || 0), 0)
  const totalProduits = (data.produits || []).reduce((s, l) => s + (Number(l.amount) || 0), 0)
  return { totalCharges, totalProduits, balance: totalProduits - totalCharges, balanced: Math.abs(totalProduits - totalCharges) < 0.005 }
}

function fmtEuro(n: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0)
  } catch {
    return (n || 0).toFixed(2) + " €"
  }
}

export function buildBudgetDoc(data: BudgetData, fileTitle = "budget") {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  const RIGHT = W - M
  let y = M
  const PURPLE = "#7c5cff"
  const LIME = "#bff24b"
  const GREEN = "#0e9f57"
  const RED = "#e5484d"
  const INK = "#0e0e10"
  const GREY = "#54545f"
  const { totalCharges, totalProduits, balance, balanced } = budgetTotals(data)

  doc.setFillColor(INK); doc.rect(0, 0, W, 10, "F")
  doc.setFillColor(LIME); doc.rect(0, 10, W, 3, "F")
  y = M + 8
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(INK)
  doc.text("Budget prévisionnel à l'équilibre", M, y)
  y += 18
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(GREY)
  doc.text((data.association || "—") + "   •   " + (data.scope || "") + "   •   " + (data.year || ""), M, y)
  y += 16
  doc.setDrawColor(PURPLE); doc.setLineWidth(1.2); doc.line(M, y, RIGHT, y); y += 24

  const colW = (RIGHT - M - 16) / 2
  const startY = y

  function column(title: string, lines: BudgetLine[], total: number, x: number, color: string) {
    let cy = startY
    doc.setFillColor(color); doc.roundedRect(x, cy, colW, 24, 5, 5, "F")
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor("#ffffff")
    doc.text(title, x + 10, cy + 16)
    cy += 34
    doc.setFontSize(9)
    for (const l of lines) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(INK)
      const lab = doc.splitTextToSize(l.label || "—", colW - 90)
      doc.text(lab, x + 6, cy)
      doc.setFont("helvetica", "bold")
      doc.text(fmtEuro(l.amount), x + colW - 6, cy, { align: "right" })
      cy += Math.max(16, lab.length * 11)
      doc.setDrawColor(235); doc.setLineWidth(0.4); doc.line(x + 6, cy - 6, x + colW - 6, cy - 6)
    }
    return cy
  }

  const leftEnd = column("CHARGES", data.charges || [], totalCharges, M, PURPLE)
  const rightEnd = column("PRODUITS", data.produits || [], totalProduits, M + colW + 16, GREEN)
  let ty = Math.max(leftEnd, rightEnd) + 8

  // Totals row
  doc.setFillColor("#e9e9e5"); doc.roundedRect(M, ty, colW, 26, 5, 5, "F")
  doc.roundedRect(M + colW + 16, ty, colW, 26, 5, 5, "F")
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(INK)
  doc.text("Total charges", M + 8, ty + 17)
  doc.text(fmtEuro(totalCharges), M + colW - 6, ty + 17, { align: "right" })
  doc.text("Total produits", M + colW + 24, ty + 17)
  doc.text(fmtEuro(totalProduits), M + colW * 2 + 10, ty + 17, { align: "right" })
  ty += 42

  // Balance indicator with a clear status badge (white check/cross on a solid circle)
  doc.setFillColor(balanced ? "#ecfad0" : "#fdeaea")
  doc.roundedRect(M, ty, RIGHT - M, 36, 6, 6, "F")
  const cx = M + 24
  const cy = ty + 18
  doc.setFillColor(balanced ? GREEN : RED)
  doc.circle(cx, cy, 9, "F")
  doc.setDrawColor("#ffffff")
  doc.setLineWidth(1.8)
  if (balanced) {
    doc.line(cx - 4, cy + 0.5, cx - 1, cy + 4)
    doc.line(cx - 1, cy + 4, cx + 4.5, cy - 3.5)
  } else {
    doc.line(cx - 3.5, cy - 3.5, cx + 3.5, cy + 3.5)
    doc.line(cx + 3.5, cy - 3.5, cx - 3.5, cy + 3.5)
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(balanced ? GREEN : RED)
  const msg = balanced
    ? "Budget équilibré — Total charges = Total produits"
    : `Budget non équilibré — écart de ${fmtEuro(Math.abs(balance))} (${balance > 0 ? "excédent de produits" : "déficit"})`
  doc.text(msg, M + 42, ty + 23)
  ty += 52

  if (data.notes) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(INK)
    doc.text("Notes & hypothèses", M, ty); ty += 14
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(GREY)
    doc.text(doc.splitTextToSize(data.notes, RIGHT - M), M, ty)
  }

  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(GREY)
  doc.text("Document établi avec Bilan — modèle indicatif basé sur le plan comptable des associations.", M, doc.internal.pageSize.getHeight() - 40)

  return {
    doc,
    filename: `${(fileTitle || "budget").replace(/[^a-z0-9_-]/gi, "_")}.pdf`,
  }
}

export function generateBudgetPdf(data: BudgetData, fileTitle = "budget") {
  const { doc, filename } = buildBudgetDoc(data, fileTitle)
  doc.save(filename)
}
