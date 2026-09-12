export interface BeneficiaryAudience {
  audienceType: string
  count: number
}

export interface FinancialRow {
  code: string
  groupCode: string
  side: "expense" | "income"
  label: string
  prevision: number
  realisation: number
  percent: number
}

export interface QualitativeReport {
  associationName: string
  siret: string
  rnaOrReceipt: string
  alsaceMoselleRegistryDate?: string
  actionImplementation: string
  beneficiariesCount: number
  beneficiariesByAudience: BeneficiaryAudience[]
  actionDates: string[]
  actionLocations: string[]
  objectivesAchievement: string
}

export interface FinancialSummary {
  exerciseYear: number
  expenseRows: FinancialRow[]
  incomeRows: FinancialRow[]
  grantAmount: number
  grantSharePercent: number
}

export interface FinancialAnnex {
  allocationRulesIndirectCosts?: string
  significantVarianceExplanation?: string
  voluntaryContributionsDetails?: string
  additionalObservations?: string
}

export interface SignatureBlock {
  signatoryFullName: string
  legalRepresentativeAssociationName: string
  signedOn: string
  signedAt: string
  signature: string
}

export interface Cerfa15059Data {
  qualitative: QualitativeReport
  financial: FinancialSummary
  annex: FinancialAnnex
  signature: SignatureBlock
}

export const CERFA_EXPENSE_GROUPS = [
  { code: "60", label: "Achats" },
  { code: "61", label: "Services extérieurs" },
  { code: "62", label: "Autres services extérieurs" },
  { code: "63", label: "Impôts et taxes" },
  { code: "64", label: "Charges de personnel" },
  { code: "65", label: "Autres charges de gestion courante" },
  { code: "66", label: "Charges financières" },
  { code: "67", label: "Charges exceptionnelles" },
  { code: "68", label: "Dotation aux amortissements" },
  { code: "indirect", label: "Charges indirectes affectées à l'action" },
  { code: "86", label: "Emplois des contributions volontaires en nature" },
] as const

export const CERFA_INCOME_GROUPS = [
  { code: "70", label: "Vente de marchandises, produits finis, prestations de services" },
  { code: "73", label: "Dotations et produits de tarification" },
  { code: "74", label: "Subventions d'exploitation" },
  { code: "75", label: "Autres produits de gestion courante" },
  { code: "76", label: "Produits financiers" },
  { code: "77", label: "Produits exceptionnels" },
  { code: "78", label: "Reports ressources non utilisées d'opérations antérieures" },
  { code: "own_resources", label: "Ressources propres affectées à l'action" },
  { code: "87", label: "Contributions volontaires en nature" },
] as const

export const CERFA_EXPENSE_ROWS: Omit<FinancialRow, "prevision" | "realisation" | "percent">[] = [
  // 60 - Achats
  { code: "60_1", groupCode: "60", side: "expense", label: "Achats matières et fournitures" },
  { code: "60_2", groupCode: "60", side: "expense", label: "Autres fournitures" },
  // 61 - Services extérieurs
  { code: "61_1", groupCode: "61", side: "expense", label: "Locations" },
  { code: "61_2", groupCode: "61", side: "expense", label: "Entretien et réparation" },
  { code: "61_3", groupCode: "61", side: "expense", label: "Assurance" },
  { code: "61_4", groupCode: "61", side: "expense", label: "Documentation" },
  // 62 - Autres services extérieurs
  { code: "62_1", groupCode: "62", side: "expense", label: "Rémunérations intermédiaires et honoraires" },
  { code: "62_2", groupCode: "62", side: "expense", label: "Publicité, publication" },
  { code: "62_3", groupCode: "62", side: "expense", label: "Déplacements, missions" },
  { code: "62_4", groupCode: "62", side: "expense", label: "Services bancaires, autres" },
  // 63 - Impôts et taxes
  { code: "63_1", groupCode: "63", side: "expense", label: "Impôts et taxes sur rémunération" },
  { code: "63_2", groupCode: "63", side: "expense", label: "Autres impôts et taxes" },
  // 64 - Charges de personnel
  { code: "64_1", groupCode: "64", side: "expense", label: "Rémunération des personnels" },
  { code: "64_2", groupCode: "64", side: "expense", label: "Charges sociales" },
  { code: "64_3", groupCode: "64", side: "expense", label: "Autres charges de personnel" },
  // 65 - Autres charges de gestion courante
  { code: "65_1", groupCode: "65", side: "expense", label: "Autres charges de gestion courante" },
  // 66 - Charges financières
  { code: "66_1", groupCode: "66", side: "expense", label: "Charges financières" },
  // 67 - Charges exceptionnelles
  { code: "67_1", groupCode: "67", side: "expense", label: "Charges exceptionnelles" },
  // 68 - Dotation aux amortissements
  { code: "68_1", groupCode: "68", side: "expense", label: "Dotation aux amortissements" },
  // indirect - Charges indirectes
  { code: "indirect_1", groupCode: "indirect", side: "expense", label: "Charges fixes de fonctionnement" },
  { code: "indirect_2", groupCode: "indirect", side: "expense", label: "Frais financiers" },
  { code: "indirect_3", groupCode: "indirect", side: "expense", label: "Autres" },
  // 86 - Emplois des contributions volontaires en nature
  { code: "86_1", groupCode: "86", side: "expense", label: "860 Secours en nature" },
  { code: "86_2", groupCode: "86", side: "expense", label: "861 Mise à disposition gratuite de biens et services" },
  { code: "86_3", groupCode: "86", side: "expense", label: "862 Prestations" },
  { code: "86_4", groupCode: "86", side: "expense", label: "864 Personnel bénévole" },
]

export const CERFA_INCOME_ROWS: Omit<FinancialRow, "prevision" | "realisation" | "percent">[] = [
  // 70 - Ventes
  { code: "70_1", groupCode: "70", side: "income", label: "Vente de marchandises, produits finis, prestations de services" },
  // 73 - Dotations
  { code: "73_1", groupCode: "73", side: "income", label: "Dotations et produits de tarification" },
  // 74 - Subventions (detailed by funder)
  { code: "74_1", groupCode: "74", side: "income", label: "État - préciser le(s) ministère(s) sollicité(s)" },
  { code: "74_2", groupCode: "74", side: "income", label: "Région(s)" },
  { code: "74_3", groupCode: "74", side: "income", label: "Département(s)" },
  { code: "74_4", groupCode: "74", side: "income", label: "Intercommunalité(s) : EPCI" },
  { code: "74_5", groupCode: "74", side: "income", label: "Commune(s)" },
  { code: "74_6", groupCode: "74", side: "income", label: "Organismes sociaux (détailler)" },
  { code: "74_7", groupCode: "74", side: "income", label: "Fonds européens" },
  { code: "74_8", groupCode: "74", side: "income", label: "Agence de services et de paiement (ex-CNASEA - emplois aidés)" },
  { code: "74_9", groupCode: "74", side: "income", label: "Autres établissements publics" },
  { code: "74_10", groupCode: "74", side: "income", label: "Aides privées" },
  // 75 - Autres produits
  { code: "75_1", groupCode: "75", side: "income", label: "Dont cotisations, dons manuels ou legs" },
  // 76 - Produits financiers
  { code: "76_1", groupCode: "76", side: "income", label: "Produits financiers" },
  // 77 - Produits exceptionnels
  { code: "77_1", groupCode: "77", side: "income", label: "Produits exceptionnels" },
  // 78 - Reports
  { code: "78_1", groupCode: "78", side: "income", label: "Reports ressources non utilisées d'opérations antérieures" },
  // own_resources
  { code: "own_1", groupCode: "own_resources", side: "income", label: "Ressources propres affectées à l'action" },
  // 87 - Contributions volontaires
  { code: "87_1", groupCode: "87", side: "income", label: "870 Bénévolat" },
  { code: "87_2", groupCode: "87", side: "income", label: "871 Prestations en nature" },
  { code: "87_3", groupCode: "87", side: "income", label: "875 Dons en nature" },
]
