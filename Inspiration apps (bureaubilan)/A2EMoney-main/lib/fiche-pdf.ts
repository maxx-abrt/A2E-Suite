"use client"

import { jsPDF } from "jspdf"

interface ExportArgs {
  template: string
  title: string
  data: any | null // null => blank
  locale: string
}

const FR_LABELS = {
  thematic: "Thématique",
  thematics: {
    culture: "Culture", sport: "Sport", social: "Social",
    education: "Éducation", other: "Autre",
  },
  association: "Porteur du projet (association / service)",
  referent: "Référent",
  phone: "Tél",
  email: "Mail",
  ficheTitle: "Titre du projet",
  context: "Constat de départ (situation, problème, besoin repéré)",
  origin: "Origine de l'idée (terrain, bénévoles, partenaires…)",
  linkToProject: "Lien avec le projet associatif global",
  audience: "Public(s) visé(s)",
  ageProfile: "Profil / âge",
  estimatedParticipants: "Nombre estimé de participants",
  geographicArea: "Zone géographique",
  identifiedNeeds: "Besoins repérés",
  needs: {
    isolation: "Isolement / manque de lien social",
    economic: "Difficultés économiques",
    culturalAccess: "Manque d'accès à l'offre culturelle / sportive",
    educational: "Difficultés scolaires / éducatives",
    other: "Autre",
  },
  generalObjective: "Objectif général (en une phrase)",
  specificObjectives: "Objectifs spécifiques (3 à 4 objectifs opérationnels)",
  actionTypes: "Type d'actions prévues",
  actions: {
    workshops: "Ateliers réguliers",
    event: "Événement ponctuel",
    individualSupport: "Accompagnement individuel",
    awareness: "Sensibilisation / information",
    other: "Autre",
  },
  action: "Action",
  audienceLabel: "Public",
  frequency: "Fréquence",
  period: "Période / dates",
  volunteers: "Bénévoles",
  employees: "Salariés",
  externalContributors: "Intervenants externes",
  materialResources: "Moyens matériels / logistiques",
  partners: "Partenaires pressentis",
  partnersOptions: {
    localGov: "Collectivités locales",
    associations: "Autres associations",
    schools: "Établissements scolaires / universitaires",
    companies: "Entreprises / mécénat",
    other: "Autre",
  },
  targetParticipants: "Cible : nombre de participants",
  targetAttendance: "Cible : taux de participation (%)",
  qualitativeIndicators: "Autres indicateurs (qualitatifs)",
  trackingTools: "Outils de suivi",
  trackingOptions: {
    attendance: "Feuilles de présence",
    satisfaction: "Questionnaire de satisfaction",
    collective: "Temps d'échange collectif",
    report: "Bilan écrit / rapport d'activité",
    other: "Autre",
  },
  perspectives: "Perspectives (reconduction, extension, adaptation)",
  date: "Date",
  referentSignature: "Signature du référent du projet",
  boardOpinion: "Visa du Bureau / Conseil d'Administration",
  opinions: { favorable: "Avis favorable", reserved: "Avis réservé", unfavorable: "Avis défavorable" },
  observations: "Observations du Bureau",
}

const SECTIONS = [
  "1. IDENTITÉ DU PROJET",
  "2. CONTEXTE & ORIGINE DU PROJET",
  "3. PUBLICS CIBLES & BESOINS",
  "4. OBJECTIFS DU PROJET",
  "5. ACTIONS PRINCIPALES",
  "6. MOYENS & PARTENAIRES",
  "7. SUIVI, ÉVALUATION & PERSPECTIVES",
  "8. SIGNATURE",
]

export async function exportFicheToPdf({ template, title, data, locale }: ExportArgs) {
  // Dedicated legal document generators
  if (template === "recu_don") {
    const { generateRecuDonPdf, RECU_DON_DEFAULT } = await import("@/lib/documents/recu-don")
    generateRecuDonPdf({ ...RECU_DON_DEFAULT, ...(data ?? {}) }, title || "recu-don")
    return
  }
  if (template === "budget_equilibre") {
    const { generateBudgetPdf, BUDGET_DEFAULT } = await import("@/lib/documents/budget-equilibre")
    generateBudgetPdf({ ...BUDGET_DEFAULT, ...(data ?? {}) }, title || "budget")
    return
  }
  if (template === "demande_subvention") {
    const { generateDemandeSubventionPdf, DEMANDE_SUBVENTION_DEFAULT } = await import("@/lib/documents/demande-subvention")
    generateDemandeSubventionPdf({ ...DEMANDE_SUBVENTION_DEFAULT, ...(data ?? {}) }, title || "demande-subvention")
    return
  }
  if (template === "convention_subvention") {
    const { generateConventionPdf, CONVENTION_DEFAULT } = await import("@/lib/documents/convention-subvention")
    generateConventionPdf({ ...CONVENTION_DEFAULT, ...(data ?? {}) }, title || "convention-subvention")
    return
  }
  if (template === "rapport_activite") {
    const { generateRapportActivitePdf, RAPPORT_ACTIVITE_DEFAULT } = await import("@/lib/documents/rapport-activite")
    generateRapportActivitePdf({ ...RAPPORT_ACTIVITE_DEFAULT, ...(data ?? {}) }, title || "rapport-activite")
    return
  }
  if (template === "attestation_honneur") {
    const { generateAttestationPdf, ATTESTATION_DEFAULT } = await import("@/lib/documents/attestation-honneur")
    generateAttestationPdf({ ...ATTESTATION_DEFAULT, ...(data ?? {}) }, title || "attestation-honneur")
    return
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 40
  let y = M

  function ensureSpace(needed: number) {
    if (y + needed > H - M) {
      doc.addPage()
      y = M
    }
  }

  function text(s: string, opts: { size?: number; bold?: boolean; color?: string } = {}) {
    const { size = 10, bold = false, color = "#0a0a0a" } = opts
    doc.setFont("helvetica", bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(s || "", W - 2 * M)
    ensureSpace(lines.length * (size + 4))
    doc.text(lines, M, y)
    y += lines.length * (size + 4)
  }

  function rule(opacity = 1) {
    ensureSpace(8)
    doc.setDrawColor(220)
    doc.setLineWidth(0.5)
    doc.line(M, y, W - M, y)
    y += 8
  }

  function sectionHeader(label: string) {
    y += 6
    ensureSpace(28)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(M, y - 12, W - 2 * M, 22, 4, 4, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor("#0a0a0a")
    doc.text(label, M + 8, y + 3)
    y += 18
  }

  function field(label: string, value?: string | null) {
    text(label, { size: 9, color: "#5a5a5a" })
    const v = (value ?? "").toString().trim()
    if (v) {
      text(v, { size: 11 })
    } else {
      ensureSpace(20)
      doc.setDrawColor(200)
      doc.setLineWidth(0.4)
      doc.line(M, y + 14, W - M, y + 14)
      y += 22
    }
    y += 2
  }

  function checkboxLine(label: string, checked?: boolean) {
    ensureSpace(14)
    const x = M
    doc.setDrawColor(160)
    doc.rect(x, y - 8, 9, 9)
    if (checked) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor("#0a0a0a")
      doc.text("✓", x + 1.5, y - 0.5)
    }
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor("#0a0a0a")
    doc.text(label, x + 16, y - 0.5)
    y += 14
  }

  // ---- Header ----
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor("#888")
  doc.text("LOGO ASSOCIATION", M, y)
  doc.text("LOGO PARTENAIRE", W - M - 90, y)
  y += 14
  doc.setDrawColor(40)
  doc.setLineWidth(1)
  doc.line(M, y, W - M, y)
  y += 16
  text("SCHÉMA FICHE PROJET ASSOCIATIF", { size: 14, bold: true })
  text(title || "Fiche à remplir : cocher les cases ☑ et compléter les lignes.", { size: 10, color: "#555" })
  rule()

  if (template !== "asso_fr") {
    text(title, { size: 16, bold: true })
    rule()
    text(data?.content ?? "", { size: 11 })
    doc.save(`${(title || "fiche").replace(/[^a-z0-9_-]/gi, "_")}.pdf`)
    return
  }

  const d = data ?? {}

  // 1. Identity
  sectionHeader(SECTIONS[0])
  field(FR_LABELS.ficheTitle, d.ficheTitle)
  text(FR_LABELS.thematic + " :", { size: 9, color: "#5a5a5a" })
  ;(["culture", "sport", "social", "education", "other"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.thematics as any)[k], d.thematic === k),
  )
  if (d.thematic === "other" && d.thematicOther) {
    field("Précision", d.thematicOther)
  }
  field(FR_LABELS.association, d.association)
  field(FR_LABELS.referent, d.referent)
  field(FR_LABELS.phone, d.phone)
  field(FR_LABELS.email, d.email)

  // 2. Context
  sectionHeader(SECTIONS[1])
  field(FR_LABELS.context, d.context)
  field(FR_LABELS.origin, d.origin)
  field(FR_LABELS.linkToProject, d.linkToProject)

  // 3. Audience
  sectionHeader(SECTIONS[2])
  field(FR_LABELS.audience, d.audience)
  field(FR_LABELS.ageProfile, d.ageProfile)
  field(FR_LABELS.estimatedParticipants, d.estimatedParticipants)
  field(FR_LABELS.geographicArea, d.geographicArea)
  text(FR_LABELS.identifiedNeeds + " :", { size: 9, color: "#5a5a5a" })
  ;(["isolation", "economic", "culturalAccess", "educational", "other"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.needs as any)[k], !!d.needs?.[k]),
  )
  if (d.needs?.other && d.needsOther) field("Précision", d.needsOther)

  // 4. Objectives
  sectionHeader(SECTIONS[3])
  field(FR_LABELS.generalObjective, d.generalObjective)
  text(FR_LABELS.specificObjectives + " :", { size: 9, color: "#5a5a5a" })
  ;[0, 1, 2, 3].forEach((i) => {
    const v = (d.specificObjectives ?? [])[i] || ""
    field(`${i + 1})`, v)
  })

  // 5. Actions
  sectionHeader(SECTIONS[4])
  text(FR_LABELS.actionTypes + " :", { size: 9, color: "#5a5a5a" })
  ;(["workshops", "event", "individualSupport", "awareness", "other"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.actions as any)[k], !!d.actionTypes?.[k]),
  )
  if (d.actionTypes?.other && d.actionTypesOther) field("Précision", d.actionTypesOther)
  ;(d.actions ?? []).forEach((a: any, idx: number) => {
    text(`${FR_LABELS.action} ${idx + 1} :`, { size: 10, bold: true })
    field("Description", a?.description)
    field(FR_LABELS.audienceLabel, a?.audience)
    field(FR_LABELS.frequency, a?.frequency)
    field(FR_LABELS.period, a?.period)
  })

  // 6. Resources & partners
  sectionHeader(SECTIONS[5])
  text("Humains :", { size: 10, bold: true })
  field(FR_LABELS.volunteers, d.volunteers)
  field(FR_LABELS.employees, d.employees)
  field(FR_LABELS.externalContributors, d.externalContributors)
  field(FR_LABELS.materialResources, d.materialResources)
  text(FR_LABELS.partners + " :", { size: 9, color: "#5a5a5a" })
  ;(["localGov", "associations", "schools", "companies", "other"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.partnersOptions as any)[k], !!d.partners?.[k]),
  )
  if (d.partners?.other && d.partnersOther) field("Précision", d.partnersOther)

  // 7. Evaluation
  sectionHeader(SECTIONS[6])
  field(FR_LABELS.targetParticipants, d.targetParticipants)
  field(FR_LABELS.targetAttendance, d.targetAttendance)
  field(FR_LABELS.qualitativeIndicators, d.qualitativeIndicators)
  text(FR_LABELS.trackingTools + " :", { size: 9, color: "#5a5a5a" })
  ;(["attendance", "satisfaction", "collective", "report", "other"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.trackingOptions as any)[k], !!d.trackingTools?.[k]),
  )
  if (d.trackingTools?.other && d.trackingToolsOther) field("Précision", d.trackingToolsOther)
  field(FR_LABELS.perspectives, d.perspectives)

  // 8. Signature
  sectionHeader(SECTIONS[7])
  field(FR_LABELS.date, d.date)
  field(FR_LABELS.referentSignature, d.referentSignature)
  text(FR_LABELS.boardOpinion + " :", { size: 9, color: "#5a5a5a" })
  ;(["favorable", "reserved", "unfavorable"] as const).forEach((k) =>
    checkboxLine((FR_LABELS.opinions as any)[k], d.boardOpinion === k),
  )
  field(FR_LABELS.observations, d.observations)

  rule()
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8)
  doc.setTextColor("#888")
  ensureSpace(14)
  doc.text(
    `Généré par Bilan — ${new Date().toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}`,
    M,
    H - 24,
  )
  doc.save(`${(title || "fiche-projet").replace(/[^a-z0-9_-]/gi, "_")}.pdf`)
}
