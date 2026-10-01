import { type SynaRecipeDescriptor } from '@/ai/types/SynaRecipeDescriptor';
import { buildLogicFunctionToolName } from '@/ai/utils/getContextToolButtons';

// M9c — la famille de recettes Syna (US-143).
//
// Une recette est un descripteur C1 (la galerie et le catalogue M12d la lisent
// comme n'importe quel modèle) complété par deux faits d'exécution : l'outil du
// registre natif qu'elle met en scène (`toolTriggerSettings`, résolu par le
// même util que les boutons de contexte pour qu'il ne dérive jamais) et son
// statut. Aucune recette ne s'exécute ici : appliquer une recette ne fait que
// préparer un brouillon de prompt Syna, que l'utilisateur confirme ensuite
// (principe UX 5).
//
// `requiredApps` porte l'identifiant universel de l'app propriétaire de
// l'outil : sans elle, la galerie marque la recette indisponible (fail-closed)
// au lieu de promettre un outil absent. La recette facture est enregistrée
// `DEFERRED` avec P7, jamais construite : le validateur l'interdit explicitement
// tant que la facturation n'est pas ouverte.

export const SYNA_RECIPE_DESCRIPTORS: SynaRecipeDescriptor[] = [
  {
    key: 'syna-resume-page',
    version: 1,
    labels: { fr: 'Résumer la page', en: 'Summarize page' },
    category: 'Syna',
    preview: [
      {
        object: 'document',
        summary: {
          fr: 'Prépare un résumé de la page dans la conversation Syna.',
          en: 'Prepares a summary of the page in the Syna conversation.',
        },
        count: 1,
      },
    ],
    requiredApps: ['19126a9c-7cc0-4368-aaba-c7e5a87b0c48'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('summarize-document'),
    prompt: {
      fr: 'Résume cette page.',
      en: 'Summarize this page.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-reunion-vers-taches',
    version: 1,
    labels: { fr: 'Réunion → tâches', en: 'Meeting → tasks' },
    category: 'Syna',
    preview: [
      {
        object: 'task',
        summary: {
          fr: 'Propose les tâches à partir d’une note de réunion.',
          en: 'Suggests tasks from a meeting note.',
        },
        count: 1,
      },
    ],
    requiredApps: ['4f759655-84f8-434d-9c76-ee1850e8c1a4'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('extract-tasks-from-document'),
    prompt: {
      fr: 'Transforme cette réunion en tâches.',
      en: 'Turn this meeting into tasks.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-digest-hebdomadaire',
    version: 1,
    labels: { fr: 'Digest hebdomadaire', en: 'Weekly digest' },
    category: 'Syna',
    preview: [
      {
        object: 'task',
        summary: {
          fr: 'Rassemble l’avancement de la semaine dans Syna.',
          en: 'Gathers the week’s progress in Syna.',
        },
        count: 1,
      },
    ],
    requiredApps: ['4f759655-84f8-434d-9c76-ee1850e8c1a4'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('standup-digest'),
    prompt: {
      fr: 'Prépare le digest de la semaine.',
      en: 'Prepare the weekly digest.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-facture-depuis-temps',
    version: 1,
    labels: {
      fr: 'Facture depuis le temps passé',
      en: 'Draft invoice from time entries',
    },
    category: 'Syna',
    preview: [],
    requiredApps: ['b11a0000-0000-4000-8000-000000000001'],
    inputs: [],
    status: 'DEFERRED',
    requiredToolName: null,
    prompt: {
      fr: 'Prépare une facture à partir du temps passé.',
      en: 'Draft an invoice from the tracked time.',
    },
    deferral: {
      gatedBy: 'P7',
      reason:
        'Recette reportée avec P7 (Bilan) : tant que la facturation n’est pas ouverte, aucune étape facture/comptabilité ne doit être construite.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-eligibilite-subventions',
    version: 1,
    labels: {
      fr: 'Vérifier l’éligibilité aux subventions',
      en: 'Grant eligibility check',
    },
    category: 'Syna',
    preview: [
      {
        object: 'subvention',
        summary: {
          fr: 'Prépare l’analyse d’éligibilité de la structure.',
          en: 'Prepares the structure’s eligibility analysis.',
        },
        count: 1,
      },
    ],
    requiredApps: ['b11a0000-0000-4000-8000-000000000001'],
    inputs: [],
    status: 'READY',
    // Pas d'outil IA : le classement des subventions est une primitive native
    // Bilan (action cœur), utilisée telle quelle.
    requiredToolName: null,
    prompt: {
      fr: 'Vérifie notre éligibilité aux subventions.',
      en: 'Check our grant eligibility.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-reponse-email',
    version: 1,
    labels: { fr: 'Réponse e-mail', en: 'Email reply' },
    category: 'Syna',
    preview: [
      {
        object: 'messageThread',
        summary: {
          fr: 'Rédige un brouillon de réponse à un fil e-mail.',
          en: 'Drafts a reply to an email thread.',
        },
        count: 1,
      },
    ],
    requiredApps: ['c31e0000-0000-4000-8000-000000000000'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('draft-email-reply'),
    prompt: {
      fr: 'Rédige une réponse à ce fil e-mail.',
      en: 'Draft a reply to this email thread.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-traduire-page',
    version: 1,
    labels: { fr: 'Traduire la page', en: 'Translate page' },
    category: 'Syna',
    preview: [
      {
        object: 'document',
        summary: {
          fr: 'Prépare une traduction de la page dans Syna.',
          en: 'Prepares a translation of the page in Syna.',
        },
        count: 1,
      },
    ],
    requiredApps: ['19126a9c-7cc0-4368-aaba-c7e5a87b0c48'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('translate-document'),
    prompt: {
      fr: 'Traduis cette page.',
      en: 'Translate this page.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
  {
    key: 'syna-nettoyer-notes',
    version: 1,
    labels: { fr: 'Nettoyer les notes', en: 'Clean up notes' },
    category: 'Syna',
    preview: [
      {
        object: 'document',
        summary: {
          fr: 'Propose une version améliorée des notes.',
          en: 'Suggests an improved version of the notes.',
        },
        count: 1,
      },
    ],
    requiredApps: ['19126a9c-7cc0-4368-aaba-c7e5a87b0c48'],
    inputs: [],
    status: 'READY',
    requiredToolName: buildLogicFunctionToolName('improve-document-writing'),
    prompt: {
      fr: 'Nettoie et améliore ces notes.',
      en: 'Clean up and improve these notes.',
    },
    sourceUniversalIdentifier: 'a2e-host-syna',
    sourceName: 'Syna',
  },
];
