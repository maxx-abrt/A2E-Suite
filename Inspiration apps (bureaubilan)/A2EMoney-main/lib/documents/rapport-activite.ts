"use client"

// Rapport annuel d'activité — document narratif requis avec le compte rendu
// financier (CERFA 15059) et à l'appui de toute nouvelle demande de subvention.
import { createPdf } from "./pdf-kit"

export interface RapportActiviteData {
  legalName: string
  year: string
  presidentWord: string
  governance: string
  members: string
  volunteers: string
  employees: string
  activities: { title: string; description: string; beneficiaries: string; period: string }[]
  results: string
  financialSummary: string
  perspectives: string
  signatureCity: string
  signatureDate: string
  signatoryName: string
  signatoryRole: string
}

export const RAPPORT_ACTIVITE_DEFAULT: RapportActiviteData = {
  legalName: "",
  year: String(new Date().getFullYear() - 1),
  presidentWord: "",
  governance: "",
  members: "", volunteers: "", employees: "",
  activities: [
    { title: "", description: "", beneficiaries: "", period: "" },
  ],
  results: "",
  financialSummary: "",
  perspectives: "",
  signatureCity: "", signatureDate: "", signatoryName: "", signatoryRole: "Président(e)",
}

export function generateRapportActivitePdf(data: RapportActiviteData, fileTitle = "rapport-activite") {
  const d = { ...RAPPORT_ACTIVITE_DEFAULT, ...(data || {}) }
  const p = createPdf()
  p.header(
    `Rapport d'activit\u00e9 ${d.year}`,
    `Rapport annuel d'activit\u00e9 \u2014 ${d.year}`,
    d.legalName,
  )

  if (d.presidentWord) {
    p.section("Le mot du/de la pr\u00e9sident(e)")
    p.text(d.presidentWord, { size: 10 })
  }

  p.section("Vie associative")
  p.kv("Adh\u00e9rents", d.members)
  p.kv("B\u00e9n\u00e9voles actifs", d.volunteers)
  p.kv("Salari\u00e9s", d.employees)
  p.para("Gouvernance (composition du bureau / conseil d'administration)", d.governance, 2)

  p.section("Actions men\u00e9es dans l'ann\u00e9e")
  const acts = (d.activities || []).filter((a) => a.title || a.description)
  if (acts.length === 0) {
    p.para("Action 1", "", 2)
  } else {
    acts.forEach((a, i) => {
      p.text(`${i + 1}. ${a.title || "Action"}`, { size: 11, bold: true, color: "#5f6bb0" })
      if (a.period || a.beneficiaries) {
        p.text(`${a.period ? "P\u00e9riode : " + a.period : ""}${a.period && a.beneficiaries ? "   \u2022   " : ""}${a.beneficiaries ? "B\u00e9n\u00e9ficiaires : " + a.beneficiaries : ""}`, { size: 9, color: "#797481" })
      }
      p.text(a.description || "", { size: 10, gap: 6 })
    })
  }

  p.section("Bilan qualitatif & r\u00e9sultats")
  p.para("", d.results, 3)

  p.section("Synth\u00e8se financi\u00e8re")
  p.para("", d.financialSummary || "Voir les comptes annuels approuv\u00e9s (bilan, compte de r\u00e9sultat, annexe) joints au pr\u00e9sent rapport.", 2)

  p.section("Perspectives")
  p.para("", d.perspectives, 2)

  p.signature(d.signatureCity, d.signatureDate, d.signatoryName, d.signatoryRole)

  p.finish(
    "Rapport \u00e9tabli avec Bilan \u2014 \u00e0 joindre au compte rendu financier (CERFA 15059) et aux comptes annuels approuv\u00e9s.",
    fileTitle,
  )
}
