import {
  DEFAULT_INVOICE_PREFIX,
  DEFAULT_QUOTE_PREFIX,
  DEFAULT_RECEIPT_PREFIX,
} from '../../lib/numbering.ts';
import {
  findMissingStarterFiches,
  findMissingStarterSheets,
  starterFichePayloads,
  type StarterBookSheet,
  type StarterFiche,
} from '../../lib/starter-books.ts';
import {
  coreClient,
  createRecords,
  findAllRecords,
} from '../utils/records.ts';

// INSTALL = READY TO USE.
//
// Installing Bilan must leave a workspace that can record its first expense
// immediately: the French chart-of-accounts categories, the structure identity
// sheet and the starter trackers/fiches. Every step is idempotent, because an
// app can be reinstalled. Kept out of the logic-function module so the unit
// runner can exercise the write path without importing `twenty-sdk/define`.
//
// The client is injectable for the same reason as the numbering handler: the
// generated client throws before generation, so tests stub the boundary.

export type SeedingClient = Pick<
  ReturnType<typeof coreClient>,
  'query' | 'mutation'
>;

type SeedCategory = {
  name: string;
  categoryKind: 'EXPENSE' | 'INCOME' | 'BOTH';
  pcgAccount: string;
  defaultVatRate?: number;
  description?: string;
};

// Plan comptable général, classes 6 (charges) and 7 (produits), reduced to the
// lines a small structure actually uses.
export const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Achats et fournitures', categoryKind: 'EXPENSE', pcgAccount: '60', defaultVatRate: 20 },
  { name: 'Locations et charges locatives', categoryKind: 'EXPENSE', pcgAccount: '613', defaultVatRate: 20 },
  { name: 'Entretien et réparations', categoryKind: 'EXPENSE', pcgAccount: '615', defaultVatRate: 20 },
  { name: 'Assurances', categoryKind: 'EXPENSE', pcgAccount: '616', defaultVatRate: 0 },
  { name: 'Honoraires et prestations', categoryKind: 'EXPENSE', pcgAccount: '622', defaultVatRate: 20 },
  { name: 'Communication et publicité', categoryKind: 'EXPENSE', pcgAccount: '623', defaultVatRate: 20 },
  { name: 'Déplacements et missions', categoryKind: 'EXPENSE', pcgAccount: '625', defaultVatRate: 10 },
  { name: 'Frais bancaires et postaux', categoryKind: 'EXPENSE', pcgAccount: '627', defaultVatRate: 0 },
  { name: 'Impôts et taxes', categoryKind: 'EXPENSE', pcgAccount: '63', defaultVatRate: 0 },
  { name: 'Salaires et charges', categoryKind: 'EXPENSE', pcgAccount: '64', defaultVatRate: 0 },
  { name: 'Autres charges de gestion', categoryKind: 'EXPENSE', pcgAccount: '65', defaultVatRate: 0 },
  { name: 'Ventes et prestations', categoryKind: 'INCOME', pcgAccount: '70', defaultVatRate: 20 },
  { name: 'Cotisations', categoryKind: 'INCOME', pcgAccount: '756', defaultVatRate: 0 },
  { name: 'Dons et mécénat', categoryKind: 'INCOME', pcgAccount: '754', defaultVatRate: 0 },
  { name: 'Subventions d’exploitation', categoryKind: 'INCOME', pcgAccount: '74', defaultVatRate: 0 },
  { name: 'Autres produits', categoryKind: 'INCOME', pcgAccount: '75', defaultVatRate: 0 },
  { name: 'Produits financiers', categoryKind: 'INCOME', pcgAccount: '76', defaultVatRate: 0 },
];

export const seedCategories = async (
  client: SeedingClient,
): Promise<number> => {
  const existing = await findAllRecords<{ pcgAccount?: string | null }>(
    client as ReturnType<typeof coreClient>,
    'financeCategories',
    { pcgAccount: true },
    {},
  );

  const known = new Set(
    existing
      .map((category) => category.pcgAccount)
      .filter((account): account is string => typeof account === 'string'),
  );

  const missing = SEED_CATEGORIES.filter(
    (category) => !known.has(category.pcgAccount),
  ).map((category) => ({
    name: category.name,
    categoryKind: category.categoryKind,
    pcgAccount: category.pcgAccount,
    defaultVatRate: category.defaultVatRate ?? 0,
    isArchived: false,
  }));

  // Report what the Core API actually wrote, not what was requested: a
  // mutation that returns no rows seeded nothing, and the install summary must
  // not claim otherwise (the live 0-rows failure).
  const createdCategories = await createRecords(
    client as ReturnType<typeof coreClient>,
    'createFinanceCategories',
    missing,
  );

  return createdCategories.length;
};

export const seedOrgProfile = async (
  client: SeedingClient,
): Promise<boolean> => {
  const existing = await findAllRecords<{ id: string }>(
    client as ReturnType<typeof coreClient>,
    'orgProfiles',
    { id: true },
    {},
    1,
    1,
  );

  if (existing.length > 0) {
    return false;
  }

  const createdProfiles = await createRecords(
    client as ReturnType<typeof coreClient>,
    'createOrgProfiles',
    [
      {
        legalName: 'Ma structure',
        structureKind: 'ASSOCIATION',
        vatMode: 'EXEMPT',
        defaultVatRate: 0,
        fiscalYearStartMonth: 1,
        invoiceNumberPrefix: DEFAULT_INVOICE_PREFIX,
        invoiceNextNumber: 1,
        quoteNumberPrefix: DEFAULT_QUOTE_PREFIX,
        quoteNextNumber: 1,
        receiptNumberPrefix: DEFAULT_RECEIPT_PREFIX,
        receiptNextNumber: 1,
        rupRecognized: false,
      },
    ],
  );

  return createdProfiles.length > 0;
};

export const seedStarterSheets = async (
  client: SeedingClient,
): Promise<number> => {
  const existing = await findAllRecords<{ systemKey?: string | null }>(
    client as ReturnType<typeof coreClient>,
    'bookSheets',
    { systemKey: true },
    {},
  );

  const missingSheets = findMissingStarterSheets(
    existing.map((sheet) => sheet.systemKey),
  );

  const createdSheets = await createRecords(
    client as ReturnType<typeof coreClient>,
    'createBookSheets',
    missingSheets.map((sheet: StarterBookSheet) => ({
      name: sheet.name,
      description: sheet.description,
      sheetKind: 'CUSTOM',
      systemKey: sheet.systemKey,
      isDefault: false,
      isLocked: false,
      isTemplate: true,
      columns: sheet.columns,
    })),
  );

  return createdSheets.length;
};

export const seedStarterFiches = async (
  client: SeedingClient,
): Promise<number> => {
  const existing = await findAllRecords<{
    title?: string | null;
    templateKey?: string | null;
  }>(client as ReturnType<typeof coreClient>, 'fiches', {
    title: true,
    templateKey: true,
  }, {});

  const missingFiches = findMissingStarterFiches(existing);

  if (missingFiches.length === 0) {
    return 0;
  }

  const payloadByTitle = new Map(
    starterFichePayloads().map((payload) => [payload.title, payload]),
  );

  const createdFiches = await createRecords(
    client as ReturnType<typeof coreClient>,
    'createFiches',
    missingFiches
      .map((fiche: StarterFiche) => payloadByTitle.get(fiche.title))
      .filter((payload) => payload !== undefined),
  );

  return createdFiches.length;
};
