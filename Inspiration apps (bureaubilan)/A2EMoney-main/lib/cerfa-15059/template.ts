import {
  Cerfa15059Data,
  CERFA_EXPENSE_ROWS,
  CERFA_INCOME_ROWS,
} from "./types"

export function createEmptyCerfaData(): Cerfa15059Data {
  return {
    qualitative: {
      associationName: "",
      siret: "",
      rnaOrReceipt: "",
      actionImplementation: "",
      beneficiariesCount: 0,
      beneficiariesByAudience: [],
      actionDates: [],
      actionLocations: [],
      objectivesAchievement: "",
    },
    financial: {
      exerciseYear: new Date().getFullYear(),
      expenseRows: CERFA_EXPENSE_ROWS.map((r) => ({
        ...r,
        prevision: 0,
        realisation: 0,
        percent: 0,
      })),
      incomeRows: CERFA_INCOME_ROWS.map((r) => ({
        ...r,
        prevision: 0,
        realisation: 0,
        percent: 0,
      })),
      grantAmount: 0,
      grantSharePercent: 0,
    },
    annex: {
      allocationRulesIndirectCosts: "",
      significantVarianceExplanation: "",
      voluntaryContributionsDetails: "",
      additionalObservations: "",
    },
    signature: {
      signatoryFullName: "",
      legalRepresentativeAssociationName: "",
      signedOn: "",
      signedAt: "",
      signature: "",
    },
  }
}
