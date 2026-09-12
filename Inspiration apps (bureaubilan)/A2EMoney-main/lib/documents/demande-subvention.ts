"use client"

// CERFA n°12156*06 — Dossier de demande de subvention (association).
// Structured per décret n°2016-1971 : 6 rubriques + budget prévisionnel + attestation.
import { createPdf, fmtEuro } from "./pdf-kit"

export interface DemandeSubventionData {
  fundingBody: string
  requestType: "fonctionnement" | "projet"
  amountRequested: number
  year: string
  // 1. Identité
  legalName: string
  rna: string
  siret: string
  address: string
  postalCode: string
  city: string
  email: string
  phone: string
  website: string
  representativeName: string
  representativeRole: string
  // 2. Relations avec l'administration
  agrements: string
  rupRecognized: boolean
  fiscalRegime: string
  aidesPubliques3ans: string
  // 4. Personnes concourant à l'action
  volunteers: string
  employees: string
  etp: string
  members: string
  // 5. Budget prévisionnel global
  budgetYear: string
  charges: { label: string; amount: number }[]
  produits: { label: string; amount: number }[]
  // 6. Projet / objet
  projectTitle: string
  objectives: string
  description: string
  beneficiaries: string
  territory: string
  calendar: string
  means: string
  evaluation: string
  // Attestation
  attestation: boolean
  cerSigned: boolean
  signatureCity: string
  signatureDate: string
  signatoryName: string
  signatoryRole: string
}

export const DEMANDE_SUBVENTION_DEFAULT: DemandeSubventionData = {
  fundingBody: "",
  requestType: "projet",
  amountRequested: 0,
  year: String(new Date().getFullYear()),
  legalName: "", rna: "", siret: "", address: "", postalCode: "", city: "",
  email: "", phone: "", website: "", representativeName: "", representativeRole: "Président(e)",
  agrements: "", rupRecognized: false, fiscalRegime: "Non assujettie aux impôts commerciaux", aidesPubliques3ans: "",
  volunteers: "", employees: "", etp: "", members: "",
  budgetYear: String(new Date().getFullYear()),
  charges: [
    { label: "60 — Achats", amount: 0 },
    { label: "61 — Services extérieurs", amount: 0 },
    { label: "62 — Autres services extérieurs", amount: 0 },
    { label: "64 — Charges de personnel", amount: 0 },
  ],
  produits: [
    { label: "70 — Ventes / prestations", amount: 0 },
    { label: "74 — Subventions d'exploitation", amount: 0 },
    { label: "75 — Cotisations, dons", amount: 0 },
  ],
  projectTitle: "", objectives: "", description: "", beneficiaries: "", territory: "",
  calendar: "", means: "", evaluation: "",
  attestation: true, cerSigned: true,
  signatureCity: "", signatureDate: "", signatoryName: "", signatoryRole: "Président(e)",
}

export function generateDemandeSubventionPdf(data: DemandeSubventionData, fileTitle = "demande-subvention") {
  const d = { ...DEMANDE_SUBVENTION_DEFAULT, ...(data || {}) }
  const p = createPdf()
  p.header(
    "CERFA n\u00b012156*06 \u2014 Demande de subvention",
    d.projectTitle || "Dossier de demande de subvention",
    `${d.legalName || ""}${d.fundingBody ? "  \u2022  Financeur : " + d.fundingBody : ""}  \u2022  Exercice ${d.year}`,
  )

  p.section("Objet de la demande")
  p.checkbox("Subvention de fonctionnement (activit\u00e9 g\u00e9n\u00e9rale de l'association)", d.requestType === "fonctionnement")
  p.checkbox("Subvention pour un projet / une action sp\u00e9cifique", d.requestType === "projet")
  p.kv("Montant sollicit\u00e9", fmtEuro(d.amountRequested))
  p.kv("Autorit\u00e9 sollicit\u00e9e", d.fundingBody)

  p.section("1. Identit\u00e9 de l'association")
  p.kv("D\u00e9nomination", d.legalName)
  p.kv("N\u00b0 RNA (W\u2026)", d.rna)
  p.kv("N\u00b0 SIRET", d.siret)
  p.kv("Adresse du si\u00e8ge", `${d.address}${d.postalCode || d.city ? ", " + [d.postalCode, d.city].filter(Boolean).join(" ") : ""}`)
  p.kv("Courriel", d.email)
  p.kv("T\u00e9l\u00e9phone", d.phone)
  p.kv("Site internet", d.website)
  p.kv("Repr\u00e9sentant l\u00e9gal", `${d.representativeName}${d.representativeRole ? " (" + d.representativeRole + ")" : ""}`)

  p.section("2. Relations avec l'administration")
  p.kv("Agr\u00e9ments", d.agrements)
  p.checkbox("Reconnue d'utilit\u00e9 publique (RUP)", d.rupRecognized)
  p.kv("R\u00e9gime fiscal", d.fiscalRegime)
  p.para("Aides publiques re\u00e7ues sur les 3 derniers exercices", d.aidesPubliques3ans, 1)

  p.section("3. Moyens humains")
  p.kv("Adh\u00e9rents", d.members)
  p.kv("B\u00e9n\u00e9voles", d.volunteers)
  p.kv("Salari\u00e9s", d.employees)
  p.kv("\u00c9quivalents temps plein (ETP)", d.etp)

  p.section(`4. Budget pr\u00e9visionnel global \u2014 exercice ${d.budgetYear}`)
  p.budgetTable(d.charges, d.produits)

  p.section("5. Description du projet / de l'action")
  p.kv("Intitul\u00e9", d.projectTitle)
  p.para("Objectifs", d.objectives)
  p.para("Description", d.description, 3)
  p.kv("B\u00e9n\u00e9ficiaires", d.beneficiaries)
  p.kv("Territoire", d.territory)
  p.kv("Calendrier", d.calendar)
  p.para("Moyens mis en \u0153uvre", d.means, 2)
  p.para("\u00c9valuation (indicateurs de r\u00e9ussite)", d.evaluation, 2)

  p.section("6. Attestation sur l'honneur")
  p.text(
    "Je soussign\u00e9(e), repr\u00e9sentant(e) l\u00e9gal(e) de l'association, certifie que l'association est r\u00e9guli\u00e8rement d\u00e9clar\u00e9e, que les informations du pr\u00e9sent dossier sont exactes et sinc\u00e8res, et que l'association est \u00e0 jour de ses obligations administratives, comptables, sociales et fiscales.",
    { size: 9.5 },
  )
  p.spacer(4)
  p.checkbox("Je certifie l'exactitude des informations d\u00e9clar\u00e9es", d.attestation)
  p.checkbox("L'association a souscrit au Contrat d'engagement r\u00e9publicain", d.cerSigned)
  p.signature(d.signatureCity, d.signatureDate, d.signatoryName, d.signatoryRole)

  p.finish(
    "Document \u00e9tabli avec Bilan \u2014 mod\u00e8le conforme au CERFA 12156*06 (d\u00e9cret n\u00b02016-1971). \u00c0 accompagner : RIB, derniers comptes approuv\u00e9s, rapport d'activit\u00e9, statuts.",
    fileTitle,
  )
}
