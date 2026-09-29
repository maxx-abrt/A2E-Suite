import { type TemplateDescriptor } from 'twenty-shared/application';

import { STARTER_DOCUMENT_TEMPLATES } from './starter-templates.ts';

// C1 descriptor registry (PLAN M9a / US-117).
//
// The gallery (M9a-2) and the presets (M9d) read templates through ONE contract;
// this module projects the app's existing lib constants onto it — it does not
// duplicate the content. Each page starter becomes a descriptor: the key is a
// slug derived from the French title (stable, never renumbered), the fr label is
// the curated title minus its `Modèle — ` prefix (what applying it creates) and
// the en label is the gallery's English surface. The preview is the single
// `document` row the apply writes; inputs stay empty because a page template has
// no user-filled fields at apply time.

export const DOCUMENTS_TEMPLATE_CATEGORY = 'Pages';

// The app itself owns the `document` object, so no sibling app is required.
export const DOCUMENTS_REQUIRED_APPS: string[] = [];

// English labels are curated by slug, not machine-translated: a starter with no
// entry here falls back to its French title, which keeps the contract valid
// (fr+en non-empty) without inventing a translation at runtime.
const DOCUMENT_TEMPLATE_EN_LABELS: Record<string, string> = {
  'notes-reunion': 'Meeting notes',
  'brief-projet': 'Project brief',
  'specifications-produit-prd': 'Product spec (PRD)',
  'entretien-individuel': 'One-on-one',
  journal: 'Journal',
  'revue-hebdomadaire': 'Weekly review',
  'note-quotidienne': 'Daily note',
  okr: 'OKRs',
  'accueil-wiki-equipe': 'Team wiki home',
  'guide-integration': 'Onboarding guide',
  'ordre-du-jour-recurrent': 'Recurring meeting agenda',
  'journal-decisions-adr': 'Decision log (ADR)',
  retrospective: 'Retrospective',
  brainstorming: 'Brainstorming',
  'liste-de-lecture': 'Reading list',
  'notes-de-cours-cornell': 'Course notes (Cornell)',
  'plan-de-these': 'Thesis planner',
  'recettes-de-cuisine': 'Recipe book',
  'plan-de-voyage': 'Travel plan',
  'crm-personnel': 'Personal CRM',
};

// `Modèle — Notes de réunion` → `notes-reunion`. Accents and punctuation are
// folded so the key is a stable slug; a title with no ASCII letters would yield
// an empty key, so the fallback keeps the descriptor well-formed.
export const toDocumentTemplateKey = (title: string): string => {
  const withoutPrefix = title.replace(/^Modèle — /, '');

  const slug = withoutPrefix
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'modele';
};

// Applying a page template creates exactly one DOCUMENT row; nothing else.
const DOCUMENT_PREVIEW = [
  {
    object: 'document',
    summary: {
      fr: 'Crée une page à partir du modèle.',
      en: 'Creates a page from the template.',
    },
    count: 1,
  },
];

export const buildDocumentTemplateDescriptors = (): TemplateDescriptor[] =>
  STARTER_DOCUMENT_TEMPLATES.map((starterTemplate) => {
    const key = toDocumentTemplateKey(starterTemplate.title);
    const frenchLabel = starterTemplate.title.replace(/^Modèle — /, '');

    return {
      key,
      version: 1,
      labels: {
        fr: frenchLabel,
        en: DOCUMENT_TEMPLATE_EN_LABELS[key] ?? frenchLabel,
      },
      category: DOCUMENTS_TEMPLATE_CATEGORY,
      preview: DOCUMENT_PREVIEW,
      requiredApps: DOCUMENTS_REQUIRED_APPS,
      inputs: [],
    };
  });
