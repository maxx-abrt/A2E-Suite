"use client"

// Convention de subvention — obligatoire dès que le total annuel versé par un
// même financeur public dépasse 23 000 € (décret n°2001-495, art. 10 loi 2000-321).
import { createPdf, fmtEuro, frDate } from "./pdf-kit"

export interface ConventionData {
  reference: string
  // Financeur (collectivité / établissement public)
  financeur: string
  financeurRep: string
  financeurRole: string
  financeurAddress: string
  // Bénéficiaire
  legalName: string
  representativeName: string
  representativeRole: string
  rna: string
  siret: string
  address: string
  // Objet
  objet: string
  amount: number
  exercice: string
  // Versement
  paymentTerms: string
  duration: string
  affectation: string
  signatureCity: string
  signatureDate: string
}

export const CONVENTION_DEFAULT: ConventionData = {
  reference: "",
  financeur: "", financeurRep: "", financeurRole: "", financeurAddress: "",
  legalName: "", representativeName: "", representativeRole: "Président(e)", rna: "", siret: "", address: "",
  objet: "", amount: 0, exercice: String(new Date().getFullYear()),
  paymentTerms: "La subvention est versée en une seule fois à la signature de la présente convention, par virement sur le compte bancaire du bénéficiaire.",
  duration: "La présente convention est conclue pour l'exercice en cours. Elle prend effet à sa signature.",
  affectation: "",
  signatureCity: "", signatureDate: "",
}

export function generateConventionPdf(data: ConventionData, fileTitle = "convention-subvention") {
  const d = { ...CONVENTION_DEFAULT, ...(data || {}) }
  const p = createPdf()
  p.header(
    "Convention de subvention",
    d.objet ? `Convention — ${d.objet}` : "Convention de subvention",
    `${d.reference ? "R\u00e9f. " + d.reference + "  \u2022  " : ""}Exercice ${d.exercice}  \u2022  ${fmtEuro(d.amount)}`,
  )

  p.section("Entre les parties")
  p.text("D'une part,", { size: 9.5, bold: true })
  p.text(`${d.financeur || "[Financeur]"}, repr\u00e9sent\u00e9(e) par ${d.financeurRep || "\u2026"}${d.financeurRole ? ", " + d.financeurRole : ""}${d.financeurAddress ? ", dont le si\u00e8ge est " + d.financeurAddress : ""}, ci-apr\u00e8s d\u00e9nomm\u00e9(e) \u00ab le financeur \u00bb,`, { size: 10 })
  p.spacer(4)
  p.text("D'autre part,", { size: 9.5, bold: true })
  p.text(`L'association ${d.legalName || "[Association]"}${d.rna ? " (RNA " + d.rna + ")" : ""}${d.siret ? ", SIRET " + d.siret : ""}, dont le si\u00e8ge est ${d.address || "\u2026"}, repr\u00e9sent\u00e9e par ${d.representativeName || "\u2026"}, ${d.representativeRole || "repr\u00e9sentant(e) l\u00e9gal(e)"}, ci-apr\u00e8s d\u00e9nomm\u00e9e \u00ab le b\u00e9n\u00e9ficiaire \u00bb,`, { size: 10 })
  p.spacer(4)
  p.text("Il est convenu ce qui suit :", { size: 10, bold: true })

  p.section("Article 1 — Objet")
  p.text(`Le financeur attribue au b\u00e9n\u00e9ficiaire une subvention destin\u00e9e \u00e0 : ${d.objet || "\u2026"}.${d.affectation ? " " + d.affectation : ""}`, { size: 10 })

  p.section("Article 2 — Montant")
  p.text(`Le montant de la subvention est fix\u00e9 \u00e0 ${fmtEuro(d.amount)} au titre de l'exercice ${d.exercice}. Cette subvention pr\u00e9sente un caract\u00e8re non reconductible de plein droit.`, { size: 10 })

  p.section("Article 3 — Modalités de versement")
  p.text(d.paymentTerms, { size: 10 })

  p.section("Article 4 — Obligations du bénéficiaire")
  p.text("Le b\u00e9n\u00e9ficiaire s'engage \u00e0 :", { size: 10 })
  p.bullet("utiliser la subvention conform\u00e9ment \u00e0 l'objet d\u00e9fini \u00e0 l'article 1 ;")
  p.bullet("transmettre au financeur, dans les six mois suivant la cl\u00f4ture de l'exercice, un compte rendu financier conforme au CERFA n\u00b015059*02 (arr\u00eat\u00e9 du 11 octobre 2006), accompagn\u00e9 du rapport d'activit\u00e9 et des comptes annuels approuv\u00e9s ;")
  p.bullet("faire mention du soutien du financeur sur ses supports de communication ;")
  p.bullet("informer le financeur de toute modification substantielle de sa situation.")

  p.section("Article 5 — Contrôle")
  p.text("Le financeur peut proc\u00e9der \u00e0 tout contr\u00f4le ou investigation qu'il juge utile pour v\u00e9rifier que la subvention a \u00e9t\u00e9 employ\u00e9e conform\u00e9ment \u00e0 son objet. En cas de non-r\u00e9alisation ou d'emploi non conforme, le financeur peut exiger le reversement de tout ou partie des sommes vers\u00e9es.", { size: 10 })

  p.section("Article 6 — Durée")
  p.text(d.duration, { size: 10 })

  p.section("Article 7 — Résiliation")
  p.text("En cas de non-respect par l'une ou l'autre des parties des engagements de la pr\u00e9sente convention, celle-ci pourra \u00eatre r\u00e9sili\u00e9e de plein droit \u00e0 l'expiration d'un d\u00e9lai d'un mois suivant l'envoi d'une lettre recommand\u00e9e avec accus\u00e9 de r\u00e9ception valant mise en demeure.", { size: 10 })

  p.spacer(6)
  p.text(`Fait \u00e0 ${d.signatureCity || "\u2026\u2026"}, le ${frDate(d.signatureDate) || "\u2026\u2026"}, en deux exemplaires originaux.`, { size: 10 })
  p.spacer(30)
  const half = p.CW / 2
  p.doc.setDrawColor(200); p.doc.setLineWidth(0.5)
  p.doc.roundedRect(p.M, p.state.y, half - 10, 60, 4, 4, "D")
  p.doc.roundedRect(p.M + half + 10, p.state.y, half - 10, 60, 4, 4, "D")
  p.doc.setFont("helvetica", "bold"); p.doc.setFontSize(9); p.doc.setTextColor("#2c2b33")
  p.doc.text("Pour le financeur", p.M + 8, p.state.y + 14)
  p.doc.text("Pour le b\u00e9n\u00e9ficiaire", p.M + half + 18, p.state.y + 14)
  p.doc.setFont("helvetica", "normal"); p.doc.setFontSize(8); p.doc.setTextColor("#797481")
  p.doc.text(d.financeurRep || "", p.M + 8, p.state.y + 28)
  p.doc.text(d.representativeName || "", p.M + half + 18, p.state.y + 28)
  p.state.y += 74

  p.finish(
    "Convention \u00e9tablie avec Bilan \u2014 mod\u00e8le conforme au d\u00e9cret n\u00b02001-495 (convention obligatoire au-del\u00e0 de 23 000 \u20ac/an d'un m\u00eame financeur public).",
    fileTitle,
  )
}
