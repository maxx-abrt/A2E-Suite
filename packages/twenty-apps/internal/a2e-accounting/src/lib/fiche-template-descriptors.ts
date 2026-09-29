import { type TemplateDescriptor } from 'twenty-shared/application';

import { FICHE_TEMPLATES, FICHE_TEMPLATE_KEYS } from './fiche-templates.ts';

// C1 descriptor registry (PLAN M9a / US-117).
//
// The gallery (M9a-2) and the presets (M9d) read templates through ONE contract;
// this module projects the app's existing lib constants onto it — it does not
// duplicate the content. The `key` is the fiche's existing editor key
// (`ASSO_FR`, `BUDGET_MENSUEL_PERSONNEL`, …), the fr label is the curated
// French label and the en label is the gallery's English surface. A fiche
// template is descriptor/data only: applying it creates one `fiche` row whose
// payload is backfilled through `withTemplateDefaults`, and the financial
// amounts stay zero (C6). Inputs stay empty: the fiche editor is the only
// fill-in surface, not the gallery.

export const ACCOUNTING_TEMPLATE_CATEGORY = 'Bilan';

// The app itself owns `fiche`, so no sibling app is required.
export const ACCOUNTING_REQUIRED_APPS: string[] = [];

// English labels are curated by key, not machine-translated: a fiche with no
// entry here falls back to its French label, which keeps the contract valid
// (fr+en non-empty) without inventing a translation at runtime.
const FICHE_TEMPLATE_EN_LABELS: Record<string, string> = {
  ASSO_FR: 'Association project sheet',
  BLANK: 'Blank page',
  RECU_DON: 'Donation tax receipt',
  BUDGET_EQUILIBRE: 'Balanced projected budget',
  BUDGET_MENSUEL_PERSONNEL: 'Personal monthly budget',
  DEMANDE_SUBVENTION: 'Grant application (CERFA 12156)',
  CONVENTION_SUBVENTION: 'Grant agreement',
  RAPPORT_ACTIVITE: 'Annual activity report',
  ATTESTATION_HONNEUR: 'Sworn statement',
  KIT_FACTURATION_INDEPENDANT: 'Freelancer invoicing kit',
};

// Applying a fiche template creates exactly one FICHE row; nothing else.
const FICHE_PREVIEW: TemplateDescriptor['preview'] = [
  {
    object: 'fiche',
    summary: {
      fr: 'Crée une fiche depuis le modèle, montants à zéro.',
      en: 'Creates one fiche from the template, amounts zeroed.',
    },
    count: 1,
  },
];

export const buildFicheTemplateDescriptors = (): TemplateDescriptor[] =>
  FICHE_TEMPLATE_KEYS.map((key) => {
    const ficheTemplate = FICHE_TEMPLATES[key];

    return {
      key,
      version: 1,
      labels: {
        fr: ficheTemplate.label,
        en: FICHE_TEMPLATE_EN_LABELS[key] ?? ficheTemplate.label,
      },
      category: ACCOUNTING_TEMPLATE_CATEGORY,
      preview: FICHE_PREVIEW,
      requiredApps: ACCOUNTING_REQUIRED_APPS,
      inputs: [],
    };
  });
