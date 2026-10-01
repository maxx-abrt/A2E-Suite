import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { type SynaRecipeDescriptor } from '@/ai/types/SynaRecipeDescriptor';
import { isTemplateDescriptor } from 'twenty-shared/application';

export type SynaRecipeDescriptorsValidation = {
  valid: boolean;
  errors: string[];
};

const INVOICE_ACCOUNTING_TERMS = [
  'invoice',
  'accounting',
  'facture',
  'comptab',
];

const referencesInvoiceOrAccounting = (value: string): boolean => {
  const normalized = value.toLowerCase();

  return INVOICE_ACCOUNTING_TERMS.some((term) => normalized.includes(term));
};

// The registry must list the whole M9c Syna family (≥ 8) and stay honest:
// READY recipes are C1 descriptors with a staged prompt and at least one
// previewed write; DEFERRED recipes declare no write and carry their gate and
// reason. While P7 is blocked no READY recipe may write invoice/accounting.
export const validateSynaRecipeDescriptors = (
  descriptors: SynaRecipeDescriptor[] = SYNA_RECIPE_DESCRIPTORS,
): SynaRecipeDescriptorsValidation => {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  if (descriptors.length < 8) {
    errors.push('La famille doit lister au moins huit recettes Syna.');
  }

  for (const descriptor of descriptors) {
    // Read the guard into a boolean: `SynaRecipeDescriptor` is a superset of
    // `TemplateDescriptor`, so `if (!isTemplateDescriptor(descriptor))` would
    // narrow the branch to `never` and hide the real descriptor fields.
    const isValidTemplateDescriptor = isTemplateDescriptor(
      descriptor as unknown,
    );

    if (!isValidTemplateDescriptor) {
      errors.push(`Descripteur de recette invalide : ${descriptor.key}.`);
    }

    if (seenKeys.has(descriptor.key)) {
      errors.push(`Clé de recette dupliquée : ${descriptor.key}.`);
    }

    seenKeys.add(descriptor.key);

    if (
      descriptor.labels.fr.trim() === '' ||
      descriptor.labels.en.trim() === ''
    ) {
      errors.push(`Libellés fr+en manquants pour ${descriptor.key}.`);
    }

    if (
      descriptor.prompt.fr.trim() === '' ||
      descriptor.prompt.en.trim() === ''
    ) {
      errors.push(`Prompt fr+en manquant pour ${descriptor.key}.`);
    }

    if (descriptor.status === 'DEFERRED') {
      if (descriptor.preview.length > 0) {
        errors.push(
          `La recette reportée ${descriptor.key} ne doit déclarer aucune écriture.`,
        );
      }

      if (
        descriptor.deferral === undefined ||
        descriptor.deferral.reason.trim() === ''
      ) {
        errors.push(
          `La recette reportée ${descriptor.key} doit documenter sa raison.`,
        );
      }

      continue;
    }

    if (descriptor.preview.length === 0) {
      errors.push(
        `La recette prête ${descriptor.key} doit prévisualiser ses écritures.`,
      );
    }

    for (const write of descriptor.preview) {
      if (
        referencesInvoiceOrAccounting(write.object) ||
        referencesInvoiceOrAccounting(write.summary.fr) ||
        referencesInvoiceOrAccounting(write.summary.en)
      ) {
        errors.push(
          `La recette prête ${descriptor.key} ne doit pas écrire de facture ni de comptabilité (P7 bloqué).`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
};
