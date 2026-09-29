// FOLDER STRUCTURES — ready-made driveFolder trees, one per persona.
//
// A template is DATA: a stable key, a version, fr+en labels, a category and the
// folder tree it creates. It creates `driveFolder` rows only — never an
// attachment or file record (a starter template must never become a real file).
// The tree is code-data versioned with the repo, never a record from another
// workspace (C1 §3). Content names stay French; `labels` carry the gallery
// surface's two languages for US-117.

export type FolderStructureTemplateKey =
  | 'ADMINISTRATION_ENTREPRISE'
  | 'ASSOCIATION'
  | 'CLIENT'
  | 'ETUDIANT';

export type FolderStructureNode = {
  name: string;
  icon?: string;
  children?: FolderStructureNode[];
};

export type FolderStructureLabels = {
  fr: string;
  en: string;
};

export type FolderStructureTemplate = {
  key: FolderStructureTemplateKey;
  version: number;
  labels: FolderStructureLabels;
  category: string;
  // No sibling app is required: a folder tree only uses Archive's own
  // `driveFolder` object, so the gallery lists these under Archive alone.
  requiredApps: string[];
  tree: FolderStructureNode;
};

export const FOLDER_STRUCTURE_CATEGORY = 'Archive';

export const FOLDER_STRUCTURE_TEMPLATES: FolderStructureTemplate[] = [
  {
    key: 'CLIENT',
    version: 1,
    labels: { fr: 'Dossiers client', en: 'Client folders' },
    category: FOLDER_STRUCTURE_CATEGORY,
    requiredApps: [],
    tree: {
      name: 'Client',
      icon: 'IconUser',
      children: [
        {
          name: '01 — Administratif',
          icon: 'IconFolder',
          children: [
            { name: 'Contrats' },
            { name: 'Devis et factures' },
            { name: 'Pièces d’identité' },
          ],
        },
        {
          name: '02 — Échanges',
          icon: 'IconFolder',
          children: [{ name: 'Courriels' }, { name: 'Comptes rendus' }],
        },
        { name: '03 — Livrables', icon: 'IconFolder' },
        { name: '99 — Archives', icon: 'IconArchive' },
      ],
    },
  },
  {
    key: 'ASSOCIATION',
    version: 1,
    labels: { fr: 'Dossiers association', en: 'Association folders' },
    category: FOLDER_STRUCTURE_CATEGORY,
    requiredApps: [],
    tree: {
      name: 'Association',
      icon: 'IconUsers',
      children: [
        {
          name: '01 — Statuts et gouvernance',
          icon: 'IconFolder',
          children: [
            { name: 'Statuts' },
            { name: 'Procès-verbaux' },
            { name: 'Bureau et conseil' },
          ],
        },
        {
          name: '02 — Adhérents',
          icon: 'IconFolder',
          children: [{ name: 'Fiches d’adhésion' }, { name: 'Cotisations' }],
        },
        { name: '03 — Projets et actions', icon: 'IconFolder' },
        {
          name: '04 — Finances et subventions',
          icon: 'IconFolder',
          children: [
            { name: 'Budgets' },
            { name: 'Justificatifs' },
            { name: 'Subventions' },
          ],
        },
        { name: '05 — Communication', icon: 'IconFolder' },
        { name: '99 — Archives', icon: 'IconArchive' },
      ],
    },
  },
  {
    key: 'ETUDIANT',
    version: 1,
    labels: { fr: 'Dossiers étudiant', en: 'Student folders' },
    category: FOLDER_STRUCTURE_CATEGORY,
    requiredApps: [],
    tree: {
      name: 'Étudiant',
      icon: 'IconSchool',
      children: [
        {
          name: '01 — Cours',
          icon: 'IconFolder',
          children: [{ name: 'Semestre 1' }, { name: 'Semestre 2' }],
        },
        { name: '02 — Travaux dirigés', icon: 'IconFolder' },
        {
          name: '03 — Révisions',
          icon: 'IconFolder',
          children: [{ name: 'Fiches de révision' }, { name: 'Annales' }],
        },
        {
          name: '04 — Administratif',
          icon: 'IconFolder',
          children: [{ name: 'Inscriptions' }, { name: 'Attestations' }],
        },
        { name: '05 — Projets et mémoire', icon: 'IconFolder' },
        { name: '99 — Archives', icon: 'IconArchive' },
      ],
    },
  },
  {
    key: 'ADMINISTRATION_ENTREPRISE',
    version: 1,
    labels: {
      fr: 'Dossiers administration d’entreprise',
      en: 'Company administration folders',
    },
    category: FOLDER_STRUCTURE_CATEGORY,
    requiredApps: [],
    tree: {
      name: 'Administration',
      icon: 'IconBuilding',
      children: [
        {
          name: '01 — Juridique',
          icon: 'IconFolder',
          children: [
            { name: 'Statuts et Kbis' },
            { name: 'Assemblées' },
            { name: 'Contrats' },
          ],
        },
        {
          name: '02 — Comptabilité',
          icon: 'IconFolder',
          children: [
            { name: 'Factures clients' },
            { name: 'Factures fournisseurs' },
            { name: 'Justificatifs' },
            { name: 'Déclarations fiscales' },
          ],
        },
        {
          name: '03 — Ressources humaines',
          icon: 'IconFolder',
          children: [
            { name: 'Contrats de travail' },
            { name: 'Paie' },
            { name: 'Entretiens' },
          ],
        },
        { name: '04 — Assurances', icon: 'IconFolder' },
        { name: '05 — Banque', icon: 'IconFolder' },
        { name: '99 — Archives', icon: 'IconArchive' },
      ],
    },
  },
];

export const FOLDER_STRUCTURE_TEMPLATE_KEYS = FOLDER_STRUCTURE_TEMPLATES.map(
  (template) => template.key,
);

export const getFolderStructureTemplate = (
  key: string,
): FolderStructureTemplate | undefined =>
  FOLDER_STRUCTURE_TEMPLATES.find((template) => template.key === key);

// Delta by the descriptor key, not the folder name: the name is user-editable,
// the key is the stable provenance the seeder tags every created folder with.
export const findMissingFolderStructureTemplates = (
  existingTemplateKeys: (string | null | undefined)[],
): FolderStructureTemplate[] => {
  const knownKeys = new Set(existingTemplateKeys);

  return FOLDER_STRUCTURE_TEMPLATES.filter(
    (template) => !knownKeys.has(template.key),
  );
};

// Depth-first pre-order, so a parent is always created before its children and
// the seeder can resolve each child's parent id from the row it just wrote. A
// draft describes a folder only — there is no file/attachment draft here.
export type FolderStructureFolderDraft = {
  name: string;
  icon: string | null;
  parentName: string | null;
  templateKey: FolderStructureTemplateKey;
};

export const flattenFolderStructureTemplate = (
  template: FolderStructureTemplate,
): FolderStructureFolderDraft[] => {
  const drafts: FolderStructureFolderDraft[] = [];

  const walk = (
    node: FolderStructureNode,
    parentName: string | null,
  ): void => {
    drafts.push({
      name: node.name,
      icon: node.icon ?? null,
      parentName,
      templateKey: template.key,
    });

    for (const child of node.children ?? []) {
      walk(child, node.name);
    }
  };

  walk(template.tree, null);

  return drafts;
};
