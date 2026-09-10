import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import {
  DEFAULT_INVOICE_PREFIX,
  DEFAULT_QUOTE_PREFIX,
  DEFAULT_RECEIPT_PREFIX,
} from '../lib/numbering.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { ensureLedgerSheet } from './handlers/ledger-handler.ts';
import { refreshSubventions } from './handlers/refresh-subventions-handler.ts';
import {
  coreClient,
  createRecords,
  findAllRecords,
} from './utils/records.ts';

// INSTALL = READY TO USE.
//
// Installing Bilan must leave a workspace that can record its first expense
// immediately: the French chart-of-accounts categories, the system ledger, the
// structure identity sheet, and a catalogue already full of real aids. Every
// step is idempotent, because an app can be reinstalled.

type SeedCategory = {
  name: string;
  categoryKind: 'EXPENSE' | 'INCOME' | 'BOTH';
  pcgAccount: string;
  defaultVatRate?: number;
  description?: string;
};

// Plan comptable général, classes 6 (charges) and 7 (produits), reduced to the
// lines a small structure actually uses.
const SEED_CATEGORIES: SeedCategory[] = [
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

const seedCategories = async (
  client: ReturnType<typeof coreClient>,
): Promise<number> => {
  const existing = await findAllRecords<{ pcgAccount?: string | null }>(
    client,
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

  await createRecords(client, 'createFinanceCategories', missing);

  return missing.length;
};

const seedOrgProfile = async (
  client: ReturnType<typeof coreClient>,
): Promise<boolean> => {
  const existing = await findAllRecords<{ id: string }>(
    client,
    'orgProfiles',
    { id: true },
    {},
    1,
    1,
  );

  if (existing.length > 0) {
    return false;
  }

  await createRecords(client, 'createOrgProfiles', [
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
  ]);

  return true;
};

const handler = async () => {
  const client = coreClient();

  const categoriesCreated = await seedCategories(client);
  const ledgerSheet = await ensureLedgerSheet(client);
  const orgProfileCreated = await seedOrgProfile(client);

  // The catalogue is filled at install: a treasurer opening Subventions for
  // the first time must see real aids, not an empty table waiting for a cron.
  let catalogue: unknown = { skipped: true };

  try {
    catalogue = await refreshSubventions();
  } catch (error) {
    console.error(
      '[bilan] Ingestion initiale du catalogue impossible',
      error instanceof Error ? error.message : error,
    );
  }

  const summary = {
    categoriesCreated,
    ledgerSheetId: ledgerSheet.id,
    orgProfileCreated,
    catalogue,
  };

  console.log('[bilan] Installation terminée', summary);

  return summary;
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare Bilan : catégories du plan comptable, journal automatique, fiche de structure, et première ingestion du catalogue de subventions.',
  timeoutSeconds: 300,
  shouldRunSynchronously: false,
  handler,
});
