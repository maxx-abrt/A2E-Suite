// Starter books — the cashflow / donations / grants trackers the reference
// book shipped with, re-expressed as three ready-to-use CUSTOM sheets plus two
// draft fiches. Descriptors are DATA (same contract as the documents/projects
// starter seeds): the post-install function creates only the rows whose
// provenance key is missing, so reinstall or retry never duplicates a seed.
//
// Sheets are delta'd by `systemKey` (unique column on the object, distinct from
// the ledger's `bilan.default.ledger`). Fiches have no system key, so they are
// delta'd by (title, templateKey) — same missing-titles-only contract as the
// documents seeder.

import {
  type FicheTemplateKey,
  FICHE_TEMPLATE_KEYS,
  withTemplateDefaults,
} from './fiche-templates.ts';
import { type LedgerColumn, LEDGER_SYSTEM_KEY } from './ledger.ts';

export type StarterBookSheet = {
  systemKey: string;
  name: string;
  description: string;
  columns: LedgerColumn[];
};

const column = (
  id: string,
  name: string,
  type: LedgerColumn['type'],
  width: number,
  options?: string[],
): LedgerColumn => ({ id, name, type, width, isManaged: false, options });

export const STARTER_BOOK_SHEETS: StarterBookSheet[] = [
  {
    systemKey: 'bilan.starter.tresorerie',
    name: 'Trésorerie',
    description:
      'Suivi courant des entrées et sorties du compte bancaire. Le journal automatique reste la vérité : cette feuille sert au rapprochement manuel.',
    columns: [
      column('date', 'Date', 'date', 120),
      column('type', 'Type', 'select', 110, ['Recette', 'Dépense']),
      column('label', 'Libellé', 'text', 260),
      column('category', 'Catégorie', 'text', 150),
      column('amount', 'Montant', 'currency', 130),
      column('method', 'Moyen de paiement', 'text', 160),
      column('comment', 'Commentaire', 'text', 200),
    ],
  },
  {
    systemKey: 'bilan.starter.dons',
    name: 'Dons',
    description:
      'Registre des dons et cotisations reçus, avec la forme du don et l’émission du reçu fiscal (CGI art. 200).',
    columns: [
      column('date', 'Date', 'date', 120),
      column('donor', 'Donateur', 'text', 220),
      column('amount', 'Montant', 'currency', 130),
      column('forme', 'Forme', 'select', 170, [
        'Don manuel',
        'Cotisation',
        'Frais de bénévoles non remboursés',
      ]),
      column('receipt', 'Reçu fiscal', 'select', 120, ['Oui', 'Non']),
      column('comment', 'Commentaire', 'text', 200),
    ],
  },
  {
    systemKey: 'bilan.starter.subventions',
    name: 'Subventions',
    description:
      'Suivi des demandes de subvention : financeur, objet, montant demandé et statut de l’instruction.',
    columns: [
      column('date', 'Date', 'date', 120),
      column('funder', 'Financeur', 'text', 200),
      column('purpose', 'Objet', 'text', 240),
      column('amount', 'Montant', 'currency', 130),
      column('status', 'Statut', 'select', 150, [
        'En préparation',
        'Déposée',
        'Accordée',
        'Refusée',
      ]),
      column('comment', 'Commentaire', 'text', 200),
    ],
  },
];

export type StarterFiche = {
  title: string;
  templateKey: FicheTemplateKey;
};

export const STARTER_FICHES: StarterFiche[] = [
  { title: 'Budget prévisionnel à l’équilibre', templateKey: 'BUDGET_EQUILIBRE' },
  { title: 'Demande de subvention', templateKey: 'DEMANDE_SUBVENTION' },
];

export const findMissingStarterSheets = (
  existingSystemKeys: (string | null | undefined)[],
): StarterBookSheet[] => {
  const known = new Set(existingSystemKeys);

  return STARTER_BOOK_SHEETS.filter(
    (sheet) => !known.has(sheet.systemKey),
  );
};

type ExistingFiche = {
  title?: string | null;
  templateKey?: string | null;
};

export const findMissingStarterFiches = (
  existingFiches: ExistingFiche[],
): StarterFiche[] =>
  STARTER_FICHES.filter(
    (starter) =>
      !existingFiches.some(
        (existing) =>
          existing.title === starter.title &&
          existing.templateKey === starter.templateKey,
      ),
  );

// Both draft fiches are seeded with the template payload stored as written, so
// the treasurer opens a pre-PCG budget and a CERFA skeleton rather than blanks.
export const starterFichePayloads = (): {
  title: string;
  templateKey: FicheTemplateKey;
  fiscalYear: string;
  data: Record<string, unknown>;
}[] => {
  const fiscalYear = String(new Date().getUTCFullYear());

  return STARTER_FICHES.map((starter) => ({
    ...starter,
    fiscalYear,
    data: withTemplateDefaults(starter.templateKey, undefined),
  }));
};

// Guard against a starter drift: a descriptor pointing at a retired template
// key would seed a fiche the typed editor cannot render.
export const starterFicheTemplatesAreKnown = (): boolean =>
  STARTER_FICHES.every((starter) =>
    (FICHE_TEMPLATE_KEYS as string[]).includes(starter.templateKey),
  );

export const STARTER_SHEET_SYSTEM_KEYS =
  STARTER_BOOK_SHEETS.map((sheet) => sheet.systemKey);

export const isStarterSheetSystemKey = (systemKey: string): boolean =>
  systemKey !== LEDGER_SYSTEM_KEY &&
  STARTER_SHEET_SYSTEM_KEYS.includes(systemKey);
