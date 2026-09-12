"use client"

// Attestation sur l'honneur — pièce du dossier de demande de subvention
// (rubrique 6 du CERFA 12156 ; signée par le représentant légal).
import { createPdf, fmtEuro } from "./pdf-kit"

export interface AttestationData {
  legalName: string
  rna: string
  siret: string
  address: string
  representativeName: string
  representativeRole: string
  fundingBody: string
  amountRequested: number
  decExact: boolean
  decObligations: boolean
  decCer: boolean
  decNoDistribution: boolean
  decRegular: boolean
  signatureCity: string
  signatureDate: string
}

export const ATTESTATION_DEFAULT: AttestationData = {
  legalName: "", rna: "", siret: "", address: "",
  representativeName: "", representativeRole: "Président(e)",
  fundingBody: "", amountRequested: 0,
  decExact: true, decObligations: true, decCer: true, decNoDistribution: true, decRegular: true,
  signatureCity: "", signatureDate: "",
}

export function generateAttestationPdf(data: AttestationData, fileTitle = "attestation-honneur") {
  const d = { ...ATTESTATION_DEFAULT, ...(data || {}) }
  const p = createPdf()
  p.header(
    "Attestation sur l'honneur",
    "Attestation sur l'honneur",
    d.legalName,
  )

  p.section("Le/la repr\u00e9sentant(e) l\u00e9gal(e)")
  p.text(
    `Je soussign\u00e9(e) ${d.representativeName || "\u2026\u2026\u2026\u2026"}, en qualit\u00e9 de ${d.representativeRole || "repr\u00e9sentant(e) l\u00e9gal(e)"} de l'association ${d.legalName || "\u2026\u2026\u2026\u2026"}${d.rna ? " (RNA " + d.rna + ")" : ""}${d.siret ? ", SIRET " + d.siret : ""}, dont le si\u00e8ge social est situ\u00e9 ${d.address || "\u2026\u2026\u2026\u2026"},`,
    { size: 10.5 },
  )
  p.spacer(6)
  p.text("atteste sur l'honneur :", { size: 10.5, bold: true })
  p.spacer(4)

  p.checkbox("que l'association est r\u00e9guli\u00e8rement d\u00e9clar\u00e9e et en r\u00e8gle au regard de l'ensemble des d\u00e9clarations sociales et fiscales ;", d.decRegular)
  p.checkbox("l'exactitude et la sinc\u00e9rit\u00e9 des informations transmises \u00e0 l'appui de la demande ;", d.decExact)
  p.checkbox("que l'association est \u00e0 jour de ses obligations administratives, comptables, sociales et fiscales ;", d.decObligations)
  p.checkbox("que l'association a souscrit au Contrat d'engagement r\u00e9publicain (d\u00e9cret n\u00b02021-1947) ;", d.decCer)
  p.checkbox("que l'association ne proc\u00e8de \u00e0 aucune distribution de b\u00e9n\u00e9fices \u00e0 ses membres ;", d.decNoDistribution)

  p.spacer(6)
  if (d.fundingBody || d.amountRequested) {
    p.text(
      `La pr\u00e9sente attestation est \u00e9tablie \u00e0 l'appui d'une demande de subvention${d.amountRequested ? " d'un montant de " + fmtEuro(d.amountRequested) : ""}${d.fundingBody ? " aupr\u00e8s de " + d.fundingBody : ""}.`,
      { size: 10 },
    )
  }
  p.spacer(4)
  p.text(
    "Je certifie avoir qualit\u00e9 pour signer la pr\u00e9sente attestation et reconnais \u00eatre inform\u00e9(e) que toute fausse d\u00e9claration est passible de sanctions p\u00e9nales (art. 441-6 et 441-7 du Code p\u00e9nal).",
    { size: 9, color: "#797481" },
  )

  p.signature(d.signatureCity, d.signatureDate, d.representativeName, d.representativeRole)

  p.finish(
    "Attestation \u00e9tablie avec Bilan \u2014 pi\u00e8ce du dossier de demande de subvention (CERFA 12156*06).",
    fileTitle,
  )
}
