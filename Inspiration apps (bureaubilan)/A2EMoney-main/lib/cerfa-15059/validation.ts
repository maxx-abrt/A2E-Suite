import { z } from "zod"

const beneficiaryAudienceSchema = z.object({
  audienceType: z.string().min(1),
  count: z.number().int().min(0),
})

const qualitativeSchema = z.object({
  associationName: z.string().min(1, "Nom de l'association requis"),
  siret: z.string().min(14, "SIRET invalide").max(14, "SIRET invalide"),
  rnaOrReceipt: z.string().min(1, "Numéro RNA ou récépissé requis"),
  alsaceMoselleRegistryDate: z.string().optional(),
  actionImplementation: z.string().min(1, "Description de l'action requise"),
  beneficiariesCount: z.number().int().min(0),
  beneficiariesByAudience: z.array(beneficiaryAudienceSchema),
  actionDates: z.array(z.string()),
  actionLocations: z.array(z.string()),
  objectivesAchievement: z.string().min(1, "Évaluation des objectifs requise"),
})

const financialRowSchema = z.object({
  code: z.string(),
  groupCode: z.string(),
  side: z.union([z.literal("expense"), z.literal("income")]),
  label: z.string(),
  prevision: z.number().int().min(0),
  realisation: z.number().int().min(0),
  percent: z.number(),
})

const financialSchema = z.object({
  exerciseYear: z.number().int().min(2000).max(2100),
  expenseRows: z.array(financialRowSchema),
  incomeRows: z.array(financialRowSchema),
  grantAmount: z.number().int().min(0),
  grantSharePercent: z.number(),
})

const annexSchema = z.object({
  allocationRulesIndirectCosts: z.string().optional(),
  significantVarianceExplanation: z.string().optional(),
  voluntaryContributionsDetails: z.string().optional(),
  additionalObservations: z.string().optional(),
})

const signatureSchema = z.object({
  signatoryFullName: z.string().min(1, "Nom du signataire requis"),
  legalRepresentativeAssociationName: z.string().min(1, "Représentant légal requis"),
  signedOn: z.string().min(1, "Date de signature requise"),
  signedAt: z.string().min(1, "Lieu de signature requis"),
  signature: z.string(),
})

export const cerfaDataSchema = z.object({
  qualitative: qualitativeSchema,
  financial: financialSchema,
  annex: annexSchema,
  signature: signatureSchema,
})

export type CerfaDataValidated = z.infer<typeof cerfaDataSchema>

export function validateStep(
  step: 1 | 2 | 3 | 4 | 5,
  data: any,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  try {
    switch (step) {
      case 1: {
        qualitativeSchema.parse(data.qualitative)
        break
      }
      case 2: {
        financialSchema.shape.exerciseYear.parse(data.financial?.exerciseYear)
        if (!data.financial?.expenseRows?.length) errors.push("Au moins une ligne de charges requise")
        break
      }
      case 3: {
        financialSchema.shape.grantAmount.parse(data.financial?.grantAmount)
        if (!data.financial?.incomeRows?.length) errors.push("Au moins une ligne de produits requise")
        break
      }
      case 4: {
        annexSchema.parse(data.annex)
        break
      }
      case 5: {
        signatureSchema.parse(data.signature)
        break
      }
    }
  } catch (e: any) {
    if (e.errors) {
      e.errors.forEach((err: any) => errors.push(err.message))
    } else {
      errors.push(e.message)
    }
  }
  return { valid: errors.length === 0, errors }
}
