"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Cerfa15059Data, CERFA_EXPENSE_GROUPS, CERFA_INCOME_GROUPS } from "./types"
import { calcGroupTotal, calcSideTotal } from "./calculations"

interface ExportArgs {
  title: string
  data: Cerfa15059Data
}

function toEuro(value: number): string {
  return Math.round(value).toLocaleString("fr-FR")
}

export async function exportCerfaToPdf({ title, data }: ExportArgs) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const M = 36
  let y = M

  const q = data.qualitative
  const f = data.financial
  const a = data.annex
  const s = data.signature

  function header() {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text("CERFA 15059 — Compte-rendu financier de subvention", M, y)
    y += 20
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)
    doc.text(title, M, y)
    y += 24
    doc.setDrawColor(200)
    doc.setLineWidth(1)
    doc.line(M, y, W - M, y)
    y += 16
  }

  function sectionTitle(label: string) {
    doc.setFillColor(240, 240, 240)
    doc.rect(M, y - 4, W - 2 * M, 20, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(label, M + 6, y + 10)
    y += 22
  }

  function field(label: string, value?: string | number | null) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(label, M, y)
    y += 12
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const v = value !== undefined && value !== null ? String(value) : ""
    if (v) {
      const lines = doc.splitTextToSize(v, W - 2 * M)
      doc.text(lines, M, y)
      y += lines.length * 12 + 4
    } else {
      doc.setDrawColor(200)
      doc.setLineWidth(0.5)
      doc.line(M, y + 2, W - M, y + 2)
      y += 16
    }
  }

  function multiField(items: { label: string; value?: string | number | null }[]) {
    const colW = (W - 2 * M) / Math.min(items.length, 2)
    items.forEach((item, idx) => {
      const x = M + idx * colW
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(item.label, x, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const v = item.value !== undefined && item.value !== null ? String(item.value) : ""
      if (v) {
        doc.text(v, x, y + 12)
      } else {
        doc.setDrawColor(200)
        doc.line(x, y + 14, x + colW - 12, y + 14)
      }
    })
    y += 28
  }

  function checkPageBreak(needed = 60) {
    if (y + needed > doc.internal.pageSize.getHeight() - M) {
      doc.addPage()
      y = M
    }
  }

  // ===================== PAGE 1 =====================
  header()

  // Section I: Bilan qualitatif
  sectionTitle("I. BILAN QUALITATIF DE L'ACTION REALISEE")
  multiField([
    { label: "Nom de l'association", value: q.associationName },
    { label: "SIRET", value: q.siret },
  ])
  multiField([
    { label: "RNA / Récépissé", value: q.rnaOrReceipt },
    { label: "Date registre Alsace-Moselle", value: q.alsaceMoselleRegistryDate },
  ])
  field("Mise en œuvre de l'action", q.actionImplementation)
  multiField([
    { label: "Bénéficiaires", value: `${q.beneficiariesCount} personnes` },
    { label: "Dates de réalisation", value: q.actionDates.join(", ") },
  ])
  field("Lieux de réalisation", q.actionLocations.join("; "))
  field("Atteinte des objectifs", q.objectivesAchievement)

  // Section II header
  checkPageBreak()
  sectionTitle("II. TABLEAU DE SYNTHESE FINANCIER")
  doc.setFontSize(10)
  doc.text(`Exercice ${f.exerciseYear}`, M, y)
  y += 14

  // Expense table
  const expenseBody: (string | number)[][] = []
  CERFA_EXPENSE_GROUPS.forEach((group) => {
    const groupRows = f.expenseRows.filter((r) => r.groupCode === group.code)
    if (groupRows.length === 0) return
    const gPrevision = calcGroupTotal(f.expenseRows, group.code, "prevision")
    const gRealisation = calcGroupTotal(f.expenseRows, group.code, "realisation")
    const gPercent = gPrevision ? Math.round((gRealisation / gPrevision) * 100) : 0

    expenseBody.push([
      { content: group.label, styles: { fontStyle: "bold", fillColor: [245, 245, 245] } } as any,
      { content: toEuro(gPrevision), styles: { halign: "right", fontStyle: "bold" } } as any,
      { content: toEuro(gRealisation), styles: { halign: "right", fontStyle: "bold" } } as any,
      { content: `${gPercent}%`, styles: { halign: "right", fontStyle: "bold" } } as any,
    ])

    groupRows.forEach((row) => {
      expenseBody.push([
        `  ${row.label}`,
        toEuro(row.prevision),
        toEuro(row.realisation),
        `${row.percent}%`,
      ])
    })
  })

  const expenseTotalP = calcSideTotal(f.expenseRows, "expense", "prevision")
  const expenseTotalR = calcSideTotal(f.expenseRows, "expense", "realisation")
  const expenseTotalPct = expenseTotalP ? Math.round((expenseTotalR / expenseTotalP) * 100) : 0

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Charges", "Prévision (€)", "Réalisation (€)", "%"]],
    body: expenseBody,
    foot: [[`TOTAL DES CHARGES`, toEuro(expenseTotalP), toEuro(expenseTotalR), `${expenseTotalPct}%`]],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255 },
    footStyles: { fillColor: [230, 230, 230], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 80 },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 50 },
    },
  })

  y = (doc as any).lastAutoTable.finalY + 16

  // ===================== PAGE 2 (or continue) =====================
  checkPageBreak(200)

  // Income table
  const incomeBody: (string | number)[][] = []
  CERFA_INCOME_GROUPS.forEach((group) => {
    const groupRows = f.incomeRows.filter((r) => r.groupCode === group.code)
    if (groupRows.length === 0) return
    const gPrevision = calcGroupTotal(f.incomeRows, group.code, "prevision")
    const gRealisation = calcGroupTotal(f.incomeRows, group.code, "realisation")
    const gPercent = gPrevision ? Math.round((gRealisation / gPrevision) * 100) : 0

    incomeBody.push([
      { content: group.label, styles: { fontStyle: "bold", fillColor: [245, 245, 245] } } as any,
      { content: toEuro(gPrevision), styles: { halign: "right", fontStyle: "bold" } } as any,
      { content: toEuro(gRealisation), styles: { halign: "right", fontStyle: "bold" } } as any,
      { content: `${gPercent}%`, styles: { halign: "right", fontStyle: "bold" } } as any,
    ])

    groupRows.forEach((row) => {
      incomeBody.push([
        `  ${row.label}`,
        toEuro(row.prevision),
        toEuro(row.realisation),
        `${row.percent}%`,
      ])
    })
  })

  const incomeTotalP = calcSideTotal(f.incomeRows, "income", "prevision")
  const incomeTotalR = calcSideTotal(f.incomeRows, "income", "realisation")
  const incomeTotalPct = incomeTotalP ? Math.round((incomeTotalR / incomeTotalP) * 100) : 0
  const grantShare = incomeTotalR ? Math.round((f.grantAmount / incomeTotalR) * 100) : 0

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Produits", "Prévision (€)", "Réalisation (€)", "%"]],
    body: incomeBody,
    foot: [
      [`TOTAL DES PRODUITS`, toEuro(incomeTotalP), toEuro(incomeTotalR), `${incomeTotalPct}%`],
      [`Subvention : ${toEuro(f.grantAmount)} €`, "", `Représente ${grantShare}% du total des produits`, ""],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255 },
    footStyles: { fillColor: [230, 230, 230], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 80 },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 50 },
    },
  })

  y = (doc as any).lastAutoTable.finalY + 20

  // ===================== SECTION III: ANNEXE =====================
  checkPageBreak(120)
  sectionTitle("III. DONNEES CHIFFREES : ANNEXE")

  if (a.allocationRulesIndirectCosts) {
    field("Répartition des charges indirectes", a.allocationRulesIndirectCosts)
  }
  if (a.significantVarianceExplanation) {
    field("Justification des écarts significatifs", a.significantVarianceExplanation)
  }
  if (a.voluntaryContributionsDetails) {
    field("Contributions volontaires en nature", a.voluntaryContributionsDetails)
  }
  if (a.additionalObservations) {
    field("Observations complémentaires", a.additionalObservations)
  }

  // ===================== SIGNATURE =====================
  checkPageBreak(120)
  sectionTitle("CERTIFICATION")
  field("Je soussigné(e)", s.signatoryFullName)
  field("Représentant(e) légal(e) de l'association", s.legalRepresentativeAssociationName)
  multiField([
    { label: "Fait le", value: s.signedOn },
    { label: "À", value: s.signedAt },
  ])
  if (s.signature) {
    field("Mention de signature", s.signature)
  }

  doc.save(`CERFA_15059_${title.replace(/[^a-z0-9_-]/gi, "_")}.pdf`)
}
