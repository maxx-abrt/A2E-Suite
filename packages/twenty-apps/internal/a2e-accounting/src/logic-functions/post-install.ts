import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { runInstallStep, type InstallStepOutcome } from '../lib/install-steps.ts';
import {
  DEFAULT_INVOICE_PREFIX,
  DEFAULT_QUOTE_PREFIX,
  DEFAULT_RECEIPT_PREFIX,
} from '../lib/numbering.ts';
import {
  findMissingStarterFiches,
  findMissingStarterSheets,
  starterFichePayloads,
  type StarterBookSheet,
  type StarterFiche,
} from '../lib/starter-books.ts';
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

const seedStarterSheets = async (
  client: ReturnType<typeof coreClient>,
): Promise<number> => {
  const existing = await findAllRecords<{ systemKey?: string | null }>(
    client,
    'bookSheets',
    { systemKey: true },
    {},
  );

  const missingSheets = findMissingStarterSheets(
    existing.map((sheet) => sheet.systemKey),
  );

  await createRecords(
    client,
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

  return missingSheets.length;
};

const seedStarterFiches = async (
  client: ReturnType<typeof coreClient>,
): Promise<number> => {
  const existing = await findAllRecords<{ title?: string | null; templateKey?: string | null }>(
    client,
    'fiches',
    { title: true, templateKey: true },
    {},
  );

  const missingFiches = findMissingStarterFiches(existing);

  if (missingFiches.length > 0) {
    const payloadByTitle = new Map(
      starterFichePayloads().map((payload) => [payload.title, payload]),
    );

    await createRecords(
      client,
      'createFiches',
      missingFiches
        .map((fiche: StarterFiche) => payloadByTitle.get(fiche.title))
        .filter((payload) => payload !== undefined),
    );
  }

  return missingFiches.length;
};

const handler = async () => {
  const client = coreClient();

  const stepOutcomes: InstallStepOutcome<unknown>[] = [];

  const step = async <TResult>(
    stepName: string,
    run: () => Promise<TResult>,
  ) => {
    const outcome = await runInstallStep(stepName, run, (failed) =>
      stepOutcomes.push(failed),
    );

    return outcome;
  };

  const [categoriesOutcome, ledgerOutcome, orgProfileOutcome, sheetsOutcome, fichesOutcome] =
    await Promise.all([
      step('financeCategories', () => seedCategories(client)),
      step('ledgerSheet', () => ensureLedgerSheet(client)),
      step('orgProfile', () => seedOrgProfile(client)),
      step('starterSheets', () => seedStarterSheets(client)),
      step('starterFiches', () => seedStarterFiches(client)),
    ]);

  // The catalogue is filled at install: a treasurer opening Subventions for
  // the first time must see real aids, not an empty table waiting for a cron.
  const catalogueOutcome = await step('subventionCatalogue', () =>
    refreshSubventions(),
  );

  const summary = {
    steps: {
      financeCategories: categoriesOutcome.status,
      ledgerSheet: ledgerOutcome.status,
      orgProfile: orgProfileOutcome.status,
      starterSheets: sheetsOutcome.status,
      starterFiches: fichesOutcome.status,
      subventionCatalogue: catalogueOutcome.status,
    },
    failures: stepOutcomes.map((outcome) => ({
      step: outcome.step,
      error: outcome.error ?? 'Erreur inconnue.',
    })),
    categoriesCreated: categoriesOutcome.status === 'OK' ? categoriesOutcome.result : null,
    ledgerSheetId: ledgerOutcome.status === 'OK' ? ledgerOutcome.result?.id : null,
    orgProfileCreated: orgProfileOutcome.status === 'OK' ? orgProfileOutcome.result : null,
    starterSheetsCreated: sheetsOutcome.status === 'OK' ? sheetsOutcome.result : null,
    starterFichesCreated: fichesOutcome.status === 'OK' ? fichesOutcome.result : null,
    catalogue:
      catalogueOutcome.status === 'OK'
        ? catalogueOutcome.result
        : { skipped: true },
  };

  console.log('[bilan] Installation terminée', summary);

  return summary;
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare Bilan : catégories du plan comptable, journal automatique, feuilles de démarrage (trésorerie, dons, subventions), fiches budget et demande, fiche de structure, et première ingestion du catalogue de subventions.',
  timeoutSeconds: 300,
  shouldRunSynchronously: false,
  handler,
});
