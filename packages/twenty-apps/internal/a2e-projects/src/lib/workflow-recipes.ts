// LA FAMILLE DES RECETTES INTER-APPS M9c (US-107).
//
// Chaque recette est une automatisation opt-in exprimée dans le vocabulaire du
// moteur de workflow natif ; ce module est le registre de la famille : une
// entrée par recette, avec son identité (clé, version), ses libellés fr+en, sa
// catégorie, les apps requises, et la PRÉVISUALISATION de ses écritures (le
// contrat C1 : « avant appliquer, montrer ce qui sera écrit »). Le registre ne
// matérialise rien et n'active rien : c'est une source de données, comme les
// autres familles de contenu.
//
// Les recettes P7-gated n'ont pas d'écritures : elles sont enregistrées
// `DEFERRED` avec leur raison, jamais construites (la facturation reste
// bloquée en amont par P7 — le validateur l'interdit explicitement).

import { DEAL_WON_RECIPE_KEY, DEAL_WON_RECIPE_VERSION } from './deal-won-recipe.ts';
import {
  FILE_REVIEW_RECIPE_KEY,
  FILE_REVIEW_RECIPE_VERSION,
} from './file-review-recipe.ts';
import {
  MEETING_NOTES_RECIPE_KEY,
  MEETING_NOTES_RECIPE_VERSION,
} from './meeting-notes-recipe.ts';
import {
  RECURRING_TASK_GENERATOR_RECIPE_KEY,
  RECURRING_TASK_GENERATOR_RECIPE_VERSION,
} from './recurring-task-generator.ts';
import {
  TASK_DUE_REMINDER_RECIPE_KEY,
  TASK_DUE_REMINDER_RECIPE_VERSION,
} from './task-due-reminder-recipe.ts';

export type WorkflowRecipeKey =
  | typeof DEAL_WON_RECIPE_KEY
  | typeof RECURRING_TASK_GENERATOR_RECIPE_KEY
  | typeof MEETING_NOTES_RECIPE_KEY
  | typeof FILE_REVIEW_RECIPE_KEY
  | typeof TASK_DUE_REMINDER_RECIPE_KEY
  | 'invoice-paid-ledger';

export type WorkflowRecipeStatus = 'READY' | 'DEFERRED';

export type WorkflowRecipeLabels = {
  fr: string;
  en: string;
};

export type WorkflowRecipeWriteDeclaration = {
  kind: string;
  object: string;
  summary: WorkflowRecipeLabels;
};

export type WorkflowRecipeDeferral = {
  gatedBy: string;
  reason: string;
};

export type WorkflowRecipeDescriptor = {
  key: WorkflowRecipeKey;
  version: number;
  labels: WorkflowRecipeLabels;
  category: string;
  requiredApps: string[];
  status: WorkflowRecipeStatus;
  preview: WorkflowRecipeWriteDeclaration[];
  deferral?: WorkflowRecipeDeferral;
};

export const WORKFLOW_RECIPE_CATEGORY = 'Automatisations';

// Recette différée avec P7 : jamais construite, seulement listée pour montrer
// la famille complète du PLAN M9c.
export const INVOICE_PAID_LEDGER_RECIPE_KEY = 'invoice-paid-ledger';

export const WORKFLOW_RECIPE_DESCRIPTORS: WorkflowRecipeDescriptor[] = [
  {
    key: DEAL_WON_RECIPE_KEY,
    version: DEAL_WON_RECIPE_VERSION,
    labels: {
      fr: 'Affaire gagnée → projet',
      en: 'Deal won → project',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    // Bureau Discussions est optionnel : la recette se dégrade en masquant
    // l'étape canal, elle n'exige donc aucune app.
    requiredApps: [],
    status: 'READY',
    preview: [
      {
        kind: 'CREATE_PROJECT',
        object: 'project',
        summary: {
          fr: 'Crée un projet nommé d’après l’opportunité.',
          en: 'Creates a project named after the opportunity.',
        },
      },
      {
        kind: 'CREATE_CHANNEL',
        object: 'chatChannel',
        summary: {
          fr: 'Crée le canal du projet si Discussions est installé.',
          en: 'Creates the project channel when Chat is installed.',
        },
      },
    ],
  },
  {
    key: RECURRING_TASK_GENERATOR_RECIPE_KEY,
    version: RECURRING_TASK_GENERATOR_RECIPE_VERSION,
    labels: {
      fr: 'Tâches récurrentes',
      en: 'Recurring tasks',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    requiredApps: [],
    status: 'READY',
    preview: [
      {
        kind: 'CREATE_TASK',
        object: 'task',
        summary: {
          fr: 'Crée chaque occurrence due d’une tâche récurrente.',
          en: 'Creates each due occurrence of a recurring task.',
        },
      },
    ],
  },
  {
    key: MEETING_NOTES_RECIPE_KEY,
    version: MEETING_NOTES_RECIPE_VERSION,
    labels: {
      fr: 'Réunion → page de notes',
      en: 'Meeting → notes page',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    requiredApps: ['a2e-documents'],
    status: 'READY',
    preview: [
      {
        kind: 'CREATE_DOCUMENT',
        object: 'document',
        summary: {
          fr: 'Crée une page de notes dans Bureau, liée à la réunion.',
          en: 'Creates a Bureau notes page linked to the meeting.',
        },
      },
    ],
  },
  {
    key: FILE_REVIEW_RECIPE_KEY,
    version: FILE_REVIEW_RECIPE_VERSION,
    labels: {
      fr: 'Fichier déposé → tâche de relecture',
      en: 'File uploaded → review task',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    requiredApps: [],
    status: 'READY',
    preview: [
      {
        kind: 'CREATE_TASK',
        object: 'task',
        summary: {
          fr: 'Crée une tâche « Relecture » dans le projet concerné.',
          en: 'Creates a “Review” task in the target project.',
        },
      },
    ],
  },
  {
    key: TASK_DUE_REMINDER_RECIPE_KEY,
    version: TASK_DUE_REMINDER_RECIPE_VERSION,
    labels: {
      fr: 'Tâche à échéance → rappel Agenda',
      en: 'Task due → Agenda reminder',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    requiredApps: [],
    status: 'READY',
    preview: [
      {
        kind: 'CREATE_REMINDER',
        object: 'calendarEvent',
        summary: {
          fr: 'Crée un rappel Agenda à l’échéance de la tâche.',
          en: 'Creates an Agenda reminder at the task due date.',
        },
      },
    ],
  },
  {
    key: INVOICE_PAID_LEDGER_RECIPE_KEY,
    version: 1,
    labels: {
      fr: 'Facture payée → tâche terminée + écriture',
      en: 'Invoice paid → task done + ledger entry',
    },
    category: WORKFLOW_RECIPE_CATEGORY,
    requiredApps: ['a2e-accounting'],
    status: 'DEFERRED',
    preview: [],
    deferral: {
      gatedBy: 'P7',
      reason:
        'Recette reportée avec P7 (Bilan) : tant que la facturation n’est pas ouverte, aucune étape facture/comptabilité ne doit être construite.',
    },
  },
];

export const listWorkflowRecipeDescriptors = (): WorkflowRecipeDescriptor[] =>
  WORKFLOW_RECIPE_DESCRIPTORS;

export const getWorkflowRecipeDescriptor = (
  key: string,
): WorkflowRecipeDescriptor | undefined =>
  WORKFLOW_RECIPE_DESCRIPTORS.find((descriptor) => descriptor.key === key);

export type WorkflowRecipeDescriptorsValidation = {
  valid: boolean;
  errors: string[];
};

const INVOICE_ACCOUNTING_TERMS = ['invoice', 'accounting', 'facture', 'comptab'];

const referencesInvoiceOrAccounting = (value: string): boolean => {
  const normalized = value.toLowerCase();

  return INVOICE_ACCOUNTING_TERMS.some((term) => normalized.includes(term));
};

// Le registre doit lister la famille complète (≥ 6) et rester cohérent : les
// recettes prêtes ont des libellés bilingues et au moins une écriture
// prévisualisée ; les recettes reportées n'ont aucune écriture et portent leur
// raison. Tant que P7 est bloqué, aucune écriture prête ne touche facture ou
// comptabilité.
export const validateWorkflowRecipeDescriptors = (
  descriptors: WorkflowRecipeDescriptor[] = WORKFLOW_RECIPE_DESCRIPTORS,
): WorkflowRecipeDescriptorsValidation => {
  const errors: string[] = [];
  const seenKeys = new Set<string>();

  if (descriptors.length < 6) {
    errors.push('La famille doit lister au moins six recettes.');
  }

  for (const descriptor of descriptors) {
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
        referencesInvoiceOrAccounting(write.kind) ||
        referencesInvoiceOrAccounting(write.object)
      ) {
        errors.push(
          `La recette prête ${descriptor.key} ne doit pas écrire de facture ni de comptabilité (P7 bloqué).`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
};
