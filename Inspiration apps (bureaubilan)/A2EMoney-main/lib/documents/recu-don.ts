"use client"

// CERFA 11580*05 — Reçu au titre des dons à certains organismes d'intérêt général.
// Articles 200, 238 bis et 978 du Code général des impôts (CGI).
import { jsPDF } from "jspdf"

export interface RecuDonData {
  receiptNumber: string
  // Organisme bénéficiaire
  orgName: string
  orgAddress: string
  orgObject: string
  orgCategory: string // libellé de la catégorie (art. 200 / 238 bis)
  regime: { art200: boolean; art238bis: boolean; art978: boolean }
  // Donateur
  donorCivility: string // M., Mme, ou raison sociale
  donorName: string
  donorAddress: string
  // Don
  amount: number
  donDate: string // date du versement (YYYY-MM-DD)
  forme: "don_manuel" | "acte_authentique" | "acte_sous_seing" | "autre"
  nature: "numeraire" | "titres" | "autre"
  modeVersement: "especes" | "cheque" | "virement" | "autre"
  abandonRevenus: boolean
  fraisBenevoles: boolean
  // Signature
  signatoryName: string
  signatoryQuality: string
  signatureCity: string
  signatureDate: string // YYYY-MM-DD
}

export const RECU_DON_DEFAULT: RecuDonData = {
  receiptNumber: "",
  orgName: "",
  orgAddress: "",
  orgObject: "",
  orgCategory: "œuvre ou organisme d'intérêt général",
  regime: { art200: true, art238bis: false, art978: false },
  donorCivility: "",
  donorName: "",
  donorAddress: "",
  amount: 0,
  donDate: "",
  forme: "don_manuel",
  nature: "numeraire",
  modeVersement: "virement",
  abandonRevenus: false,
  fraisBenevoles: false,
  signatoryName: "",
  signatoryQuality: "Président(e)",
  signatureCity: "",
  signatureDate: "",
}

export const FORME_LABELS: Record<RecuDonData["forme"], string> = {
  don_manuel: "Acte de donation / déclaration de don manuel",
  acte_authentique: "Acte authentique",
  acte_sous_seing: "Acte sous seing privé",
  autre: "Autre",
}
export const NATURE_LABELS: Record<RecuDonData["nature"], string> = {
  numeraire: "Numéraire",
  titres: "Titres de sociétés cotées",
  autre: "Autre (don en nature)",
}
export const MODE_LABELS: Record<RecuDonData["modeVersement"], string> = {
  especes: "Remise d'espèces",
  cheque: "Chèque",
  virement: "Virement, prélèvement ou carte bancaire",
  autre: "Autre",
}

export const RECU_DON_CATEGORIES = [
  "œuvre ou organisme d'intérêt général",
  "Association ou fondation reconnue d'utilité publique",
  "Œuvre d'intérêt général à caractère social, humanitaire ou caritatif",
  "Association cultuelle ou de bienfaisance",
  "Établissement d'enseignement supérieur ou artistique",
  "Organisme d'aide aux personnes en difficulté (« loi Coluche »)",
  "Fondation d'entreprise",
  "Autre organisme éligible",
]

// ----- Montant en lettres (français) -----
const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
]
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"]

function below100(n: number): string {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10)
  const u = n % 10
  if (t === 7 || t === 9) {
    const base = TENS[t]
    const rem = below100(10 + u)
    return base + "-" + rem
  }
  let word = TENS[t]
  if (u === 0) {
    if (t === 8) word += "s"
    return word
  }
  if (u === 1 && (t === 2 || t === 3 || t === 4 || t === 5 || t === 6)) return word + " et un"
  return word + "-" + UNITS[u]
}

function below1000(n: number): string {
  if (n < 100) return below100(n)
  const h = Math.floor(n / 100)
  const rem = n % 100
  let word = h === 1 ? "cent" : UNITS[h] + " cent"
  if (rem === 0) {
    if (h > 1) word += "s"
    return word
  }
  return word + " " + below100(rem)
}

export function numberToFrenchWords(num: number): string {
  const n = Math.floor(Math.abs(num))
  if (n === 0) return "zéro"
  const parts: string[] = []
  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  if (billions) parts.push((billions === 1 ? "un" : below1000(billions)) + " milliard" + (billions > 1 ? "s" : ""))
  if (millions) parts.push(below1000(millions) + " million" + (millions > 1 ? "s" : ""))
  if (thousands) parts.push(thousands === 1 ? "mille" : below1000(thousands) + " mille")
  if (rest) parts.push(below1000(rest))
  return parts.join(" ")
}

export function amountInFrenchWords(amount: number): string {
  const euros = Math.floor(amount)
  const cents = Math.round((amount - euros) * 100)
  let s = numberToFrenchWords(euros) + (euros > 1 ? " euros" : " euro")
  if (cents > 0) s += " et " + numberToFrenchWords(cents) + (cents > 1 ? " centimes" : " centime")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtDate(d?: string): string {
  if (!d) return "……/……/……"
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return d
  }
}

function fmtEuro(n: number): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0)
  } catch {
    return (n || 0).toFixed(2) + " €"
  }
}

export function buildRecuDonDoc(data: RecuDonData, fileTitle = "recu-don") {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  const RIGHT = W - M
  let y = M

  const PURPLE = "#7c5cff"
  const LIME = "#bff24b"
  const INK = "#0e0e10"
  const GREY = "#54545f"

  function box(x: number, yy: number, w: number, h: number, fill?: string) {
    if (fill) {
      doc.setFillColor(fill)
      doc.roundedRect(x, yy, w, h, 6, 6, "F")
    } else {
      doc.setDrawColor(220)
      doc.setLineWidth(0.6)
      doc.roundedRect(x, yy, w, h, 6, 6, "S")
    }
  }
  function label(s: string, x: number, yy: number, size = 8) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(GREY)
    doc.text(s, x, yy)
  }
  function val(s: string, x: number, yy: number, size = 10, bold = true) {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(INK)
    doc.text(s || "—", x, yy)
  }
  function check(on: boolean, x: number, yy: number, txt: string) {
    doc.setDrawColor(120); doc.setLineWidth(0.8)
    doc.rect(x, yy - 8, 10, 10, "S")
    if (on) { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(PURPLE); doc.text("X", x + 1.6, yy) }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(INK)
    doc.text(txt, x + 16, yy)
  }

  // Header band (ink with a lime baseline accent — Moneyfly cue)
  doc.setFillColor(INK)
  doc.rect(0, 0, W, 10, "F")
  doc.setFillColor(LIME)
  doc.rect(0, 10, W, 3, "F")
  y = M + 6
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(INK)
  doc.text("Reçu au titre des dons à certains", M, y)
  y += 18
  doc.text("organismes d'intérêt général", M, y)
  // CERFA badge
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(PURPLE)
  doc.text("N° CERFA 11580*05", RIGHT, M + 8, { align: "right" })
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(GREY)
  doc.text("Articles 200, 238 bis et 978 du CGI", RIGHT, M + 22, { align: "right" })
  doc.text("Reçu n° " + (data.receiptNumber || "…………"), RIGHT, M + 36, { align: "right" })
  y += 16
  doc.setDrawColor(PURPLE); doc.setLineWidth(1.2); doc.line(M, y, RIGHT, y); y += 22

  // Bénéficiaire
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(PURPLE)
  doc.text("Bénéficiaire du don", M, y); y += 6
  box(M, y, RIGHT - M, 86); y += 18
  label("Dénomination de l'organisme", M + 12, y); val(data.orgName, M + 12, y + 14, 11)
  y += 34
  label("Adresse complète", M + 12, y); val(data.orgAddress, M + 12, y + 13, 9)
  y += 30
  label("Objet", M + 12, y); val(data.orgObject, M + 12, y + 13, 9)
  y += 28
  // Catégorie
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(GREY)
  doc.text("Cocher la case concernant l'organisme :", M, y); y += 14
  check(data.regime.art200, M, y, "Don ouvrant droit à réduction d'impôt sur le revenu (art. 200 CGI)")
  y += 16
  check(data.regime.art238bis, M, y, "Don d'entreprise (art. 238 bis CGI)")
  y += 16
  check(data.regime.art978, M, y, "Don ouvrant droit à réduction d'IFI (art. 978 CGI)")
  y += 14
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(GREY)
  doc.text("Catégorie : " + (data.orgCategory || "—"), M, y); y += 22

  // Donateur
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(PURPLE)
  doc.text("Donateur", M, y); y += 6
  box(M, y, RIGHT - M, 56); y += 18
  label("Nom et prénom (ou raison sociale)", M + 12, y)
  val(((data.donorCivility ? data.donorCivility + " " : "") + data.donorName).trim(), M + 12, y + 14, 11)
  y += 32
  label("Adresse", M + 12, y); val(data.donorAddress, M + 12, y + 13, 9)
  y += 34

  // Don / montant
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(PURPLE)
  doc.text("Don", M, y); y += 8
  // Highlighted amount box (height adapts to amount-in-words wrapping)
  const amountStr = fmtEuro(data.amount)
  const wordsStr = "Soit : " + amountInFrenchWords(data.amount)
  doc.setFont("helvetica", "italic"); doc.setFontSize(9)
  const wordsLines = doc.splitTextToSize(wordsStr, RIGHT - M - 24) as string[]
  const amountBoxH = 50 + wordsLines.length * 12
  box(M, y, RIGHT - M, amountBoxH, "#eeeafe")
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(GREY)
  doc.text(
    doc.splitTextToSize(
      "L'organisme reconnaît avoir reçu au titre des dons et versements ouvrant droit à réduction d'impôt, la somme de :",
      RIGHT - M - 24,
    ),
    M + 12,
    y + 16,
  )
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(PURPLE)
  doc.text(amountStr, M + 12, y + 40)
  doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(INK)
  doc.text(wordsLines, M + 12, y + 54)
  y += amountBoxH + 16
  label("Date du versement", M, y); val(fmtDate(data.donDate), M, y + 14, 10)
  y += 30

  // Forme / nature / mode (3 colonnes)
  const colW = (RIGHT - M) / 3
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(INK)
  doc.text("Forme du don", M, y)
  doc.text("Nature du don", M + colW, y)
  doc.text("Mode de versement", M + colW * 2, y)
  y += 14
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(INK)
  doc.text(doc.splitTextToSize(FORME_LABELS[data.forme], colW - 8), M, y)
  doc.text(doc.splitTextToSize(NATURE_LABELS[data.nature], colW - 8), M + colW, y)
  doc.text(doc.splitTextToSize(MODE_LABELS[data.modeVersement], colW - 8), M + colW * 2, y)
  y += 30
  if (data.abandonRevenus || data.fraisBenevoles) {
    if (data.abandonRevenus) { check(true, M, y, "Don correspondant à un abandon de revenus ou de produits"); y += 16 }
    if (data.fraisBenevoles) { check(true, M, y, "Don correspondant à des frais engagés par les bénévoles, dont ils renoncent au remboursement"); y += 16 }
    y += 4
  }

  // Signature
  doc.setDrawColor(220); doc.setLineWidth(0.6); doc.line(M, y, RIGHT, y); y += 20
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(INK)
  doc.text("Fait à " + (data.signatureCity || "…………") + ", le " + fmtDate(data.signatureDate), M, y)
  y += 26
  doc.setFontSize(9); doc.setTextColor(GREY)
  doc.text("Le représentant habilité de l'organisme", RIGHT - 200, y)
  y += 14
  val(data.signatoryName, RIGHT - 200, y, 10)
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(GREY)
  doc.text(data.signatoryQuality || "", RIGHT - 200, y + 12)
  doc.setDrawColor(200); doc.line(RIGHT - 200, y + 40, RIGHT, y + 40)
  doc.setFontSize(7); doc.text("Signature", RIGHT - 200, y + 50)

  // Legal footer (art. 1740 A CGI)
  doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(GREY)
  const footer = doc.splitTextToSize(
    "La délivrance irrégulière de reçus, certificats ou autres documents permettant à un contribuable d'obtenir une réduction d'impôt est sanctionnée par une amende fiscale (article 1740 A du CGI). Ce reçu doit être conservé par le donateur à l'appui de sa déclaration de revenus.",
    RIGHT - M,
  )
  doc.text(footer, M, doc.internal.pageSize.getHeight() - 56)

  return {
    doc,
    filename: `${(fileTitle || "recu-don").replace(/[^a-z0-9_-]/gi, "_")}.pdf`,
  }
}

export function generateRecuDonPdf(data: RecuDonData, fileTitle = "recu-don") {
  const { doc, filename } = buildRecuDonDoc(data, fileTitle)
  doc.save(filename)
}
