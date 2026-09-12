"use client"

// Shared jsPDF toolkit for Bilan legal/finance documents.
// Produces clean, consistent, on-brand A4 PDFs (lavender #8590C8).
import { jsPDF } from "jspdf"

export const BRAND = {
  primary: "#8590c8",
  primaryDark: "#5f6bb0",
  ink: "#2c2b33",
  grey: "#797481",
  line: "#e5ddd2",
  soft: "#edeef8",
  green: "#3fa780",
  red: "#d1553f",
  paper: "#faf7f3",
}

export function fmtEuro(n: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0)
  } catch {
    return (n || 0).toFixed(2) + " \u20ac"
  }
}

export function frDate(s?: string | number | null): string {
  if (!s && s !== 0) return ""
  try {
    const d = typeof s === "number" ? new Date(s) : new Date(String(s))
    if (isNaN(d.getTime())) return String(s)
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return String(s)
  }
}

export function safeName(s: string): string {
  return (s || "document").replace(/[^a-z0-9_-]/gi, "_").slice(0, 60)
}

type TextOpts = { size?: number; bold?: boolean; italic?: boolean; color?: string; gap?: number }

/** Builder around a jsPDF doc with brand-consistent primitives + auto page breaks. */
export function createPdf() {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  const RIGHT = W - M
  const CW = RIGHT - M
  const state = { y: M }

  function ensure(needed: number) {
    if (state.y + needed > H - 54) {
      doc.addPage()
      state.y = M
    }
  }

  function setFont(o: TextOpts = {}) {
    const style = o.bold ? (o.italic ? "bolditalic" : "bold") : o.italic ? "italic" : "normal"
    doc.setFont("helvetica", style)
    doc.setFontSize(o.size ?? 10)
    doc.setTextColor(o.color ?? BRAND.ink)
  }

  function text(s: string, o: TextOpts = {}) {
    setFont(o)
    const size = o.size ?? 10
    const lines = doc.splitTextToSize(s ?? "", CW)
    ensure(lines.length * (size + 4) + (o.gap ?? 0))
    doc.text(lines, M, state.y)
    state.y += lines.length * (size + 4) + (o.gap ?? 0)
  }

  /** Brand header: lavender bar, kicker, title, subtitle. */
  function header(kicker: string, title: string, subtitle?: string) {
    doc.setFillColor(BRAND.primary)
    doc.rect(0, 0, W, 6, "F")
    state.y = M + 4
    // Bilan wordmark (top-right)
    setFont({ size: 10, bold: true, color: BRAND.primaryDark })
    doc.text("Bilan", RIGHT, state.y - 8, { align: "right" })
    if (kicker) {
      setFont({ size: 8, bold: true, color: BRAND.primary })
      doc.text((kicker || "").toUpperCase(), M, state.y)
      state.y += 14
    }
    setFont({ size: 17, bold: true, color: BRAND.ink })
    const tl = doc.splitTextToSize(title || "", CW)
    doc.text(tl, M, state.y)
    state.y += tl.length * 20
    if (subtitle) {
      setFont({ size: 10, color: BRAND.grey })
      const sl = doc.splitTextToSize(subtitle, CW)
      doc.text(sl, M, state.y)
      state.y += sl.length * 13
    }
    state.y += 6
    doc.setDrawColor(BRAND.primary)
    doc.setLineWidth(1.2)
    doc.line(M, state.y, RIGHT, state.y)
    state.y += 20
  }

  function section(label: string) {
    state.y += 4
    ensure(30)
    doc.setFillColor(BRAND.soft)
    doc.roundedRect(M, state.y - 12, CW, 24, 5, 5, "F")
    doc.setFillColor(BRAND.primary)
    doc.roundedRect(M, state.y - 12, 4, 24, 2, 2, "F")
    setFont({ size: 11, bold: true, color: BRAND.primaryDark })
    doc.text((label || "").toUpperCase(), M + 14, state.y + 4)
    state.y += 26
  }

  /** label + value, value on same row (right) if short, else stacked. */
  function kv(label: string, value?: string | number | null) {
    const v = (value ?? "").toString().trim()
    setFont({ size: 9, color: BRAND.grey })
    ensure(16)
    doc.text(label, M, state.y)
    if (v) {
      setFont({ size: 10, bold: true, color: BRAND.ink })
      const vlines = doc.splitTextToSize(v, CW - 170)
      doc.text(vlines, M + 170, state.y)
      state.y += Math.max(15, vlines.length * 13)
    } else {
      doc.setDrawColor(210)
      doc.setLineWidth(0.4)
      doc.line(M + 170, state.y + 2, RIGHT, state.y + 2)
      state.y += 15
    }
  }

  function para(label: string, value?: string | null, minLines = 2) {
    if (label) {
      setFont({ size: 9, bold: true, color: BRAND.grey })
      ensure(14)
      doc.text(label, M, state.y)
      state.y += 13
    }
    const v = (value ?? "").toString().trim()
    if (v) {
      text(v, { size: 10 })
    } else {
      for (let i = 0; i < minLines; i++) {
        ensure(16)
        doc.setDrawColor(215)
        doc.setLineWidth(0.4)
        doc.line(M, state.y + 6, RIGHT, state.y + 6)
        state.y += 16
      }
    }
    state.y += 4
  }

  function bullet(s: string) {
    setFont({ size: 10, color: BRAND.ink })
    const lines = doc.splitTextToSize(s ?? "", CW - 14)
    ensure(lines.length * 14)
    doc.setFillColor(BRAND.primary)
    doc.circle(M + 3, state.y - 3, 1.6, "F")
    doc.text(lines, M + 14, state.y)
    state.y += lines.length * 14 + 2
  }

  function checkbox(label: string, checked?: boolean) {
    ensure(15)
    const x = M
    doc.setDrawColor(checked ? BRAND.primary : "#a8a2ac")
    doc.setLineWidth(checked ? 1.1 : 0.7)
    if (checked) {
      doc.setFillColor(BRAND.primary)
      doc.roundedRect(x, state.y - 8, 10, 10, 2, 2, "FD")
      doc.setDrawColor("#ffffff")
      doc.setLineWidth(1.2)
      doc.line(x + 2, state.y - 3, x + 4, state.y - 1)
      doc.line(x + 4, state.y - 1, x + 8, state.y - 6)
    } else {
      doc.roundedRect(x, state.y - 8, 10, 10, 2, 2, "D")
    }
    setFont({ size: 10, color: BRAND.ink })
    doc.text(label, x + 18, state.y)
    state.y += 15
  }

  /** Two-column charges/produits budget table with balance banner. */
  function budgetTable(charges: { label: string; amount: number }[], produits: { label: string; amount: number }[]) {
    const totC = (charges || []).reduce((s, l) => s + (Number(l.amount) || 0), 0)
    const totP = (produits || []).reduce((s, l) => s + (Number(l.amount) || 0), 0)
    const colW = (CW - 16) / 2
    const startY = state.y

    function col(title: string, lines: any[], x: number, color: string) {
      let cy = startY
      doc.setFillColor(color)
      doc.roundedRect(x, cy, colW, 22, 4, 4, "F")
      setFont({ size: 10, bold: true, color: "#ffffff" })
      doc.text(title, x + 8, cy + 15)
      cy += 30
      for (const l of lines || []) {
        setFont({ size: 8.5, color: BRAND.ink })
        const lab = doc.splitTextToSize(l.label || "\u2014", colW - 78)
        doc.text(lab, x + 4, cy)
        setFont({ size: 8.5, bold: true, color: BRAND.ink })
        doc.text(fmtEuro(l.amount), x + colW - 4, cy, { align: "right" })
        cy += Math.max(14, lab.length * 10)
        doc.setDrawColor(238); doc.setLineWidth(0.3); doc.line(x + 4, cy - 5, x + colW - 4, cy - 5)
      }
      return cy
    }

    ensure(120)
    const le = col("CHARGES (d\u00e9penses)", charges, M, BRAND.primary)
    const re = col("PRODUITS (recettes)", produits, M + colW + 16, BRAND.green)
    let ty = Math.max(le, re) + 6
    doc.setFillColor("#efe9e2")
    doc.roundedRect(M, ty, colW, 22, 4, 4, "F")
    doc.roundedRect(M + colW + 16, ty, colW, 22, 4, 4, "F")
    setFont({ size: 9, bold: true, color: BRAND.ink })
    doc.text("Total charges", M + 6, ty + 15)
    doc.text(fmtEuro(totC), M + colW - 4, ty + 15, { align: "right" })
    doc.text("Total produits", M + colW + 22, ty + 15)
    doc.text(fmtEuro(totP), M + colW * 2 + 12, ty + 15, { align: "right" })
    ty += 30
    const balanced = Math.abs(totP - totC) < 0.005
    doc.setFillColor(balanced ? "#e6f2ec" : "#fdeeea")
    doc.roundedRect(M, ty, CW, 26, 5, 5, "F")
    setFont({ size: 10, bold: true, color: balanced ? BRAND.green : BRAND.red })
    doc.text(
      balanced
        ? "\u2713 Budget \u00e9quilibr\u00e9 \u2014 Total charges = Total produits"
        : `\u0394 \u00e9cart de ${fmtEuro(Math.abs(totP - totC))} \u2014 ${totP > totC ? "exc\u00e9dent" : "d\u00e9ficit"}`,
      M + 12, ty + 17,
    )
    state.y = ty + 38
  }

  function signature(city?: string, date?: string, name?: string, role?: string) {
    ensure(70)
    state.y += 6
    setFont({ size: 10, color: BRAND.ink })
    doc.text(`Fait \u00e0 ${city || "\u2026\u2026\u2026\u2026"}, le ${frDate(date) || "\u2026\u2026\u2026\u2026"}`, M, state.y)
    state.y += 18
    setFont({ size: 9, color: BRAND.grey })
    doc.text(`${role || "Le/la repr\u00e9sentant(e) l\u00e9gal(e)"}${name ? " \u2014 " + name : ""}`, RIGHT - 200, state.y)
    state.y += 6
    doc.setDrawColor(200); doc.setLineWidth(0.5)
    doc.roundedRect(RIGHT - 200, state.y, 200, 46, 4, 4, "D")
    setFont({ size: 8, italic: true, color: "#b4aeb8" })
    doc.text("Signature", RIGHT - 194, state.y + 12)
    state.y += 58
  }

  function divider() {
    ensure(10)
    doc.setDrawColor(BRAND.line); doc.setLineWidth(0.6)
    doc.line(M, state.y, RIGHT, state.y)
    state.y += 12
  }

  function spacer(n = 8) { state.y += n }

  /** Legal note + footer on every page. */
  function finish(note: string, filename: string) {
    const pages = doc.getNumberOfPages()
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p)
      doc.setDrawColor(BRAND.line); doc.setLineWidth(0.5)
      doc.line(M, H - 40, RIGHT, H - 40)
      setFont({ size: 7, italic: true, color: BRAND.grey })
      const nlines = doc.splitTextToSize(note || "", CW - 60)
      doc.text(nlines, M, H - 30)
      doc.text(`${p}/${pages}`, RIGHT, H - 30, { align: "right" })
    }
    doc.save(`${safeName(filename)}.pdf`)
  }

  return { doc, W, H, M, RIGHT, CW, state, ensure, text, header, section, kv, para, bullet, checkbox, budgetTable, signature, divider, spacer, finish }
}

export type PdfKit = ReturnType<typeof createPdf>
