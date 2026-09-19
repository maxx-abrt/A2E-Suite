import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { runInstallStep, type InstallStepOutcome } from '../lib/install-steps.ts';
import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { ensureLedgerSheet } from './handlers/ledger-handler.ts';
import { refreshSubventions } from './handlers/refresh-subventions-handler.ts';
import {
  seedCategories,
  seedOrgProfile,
  seedStarterFiches,
  seedStarterSheets,
} from './handlers/seed-starter-content.ts';
import { coreClient } from './utils/records.ts';

// INSTALL = READY TO USE.
//
// Installing Bilan must leave a workspace that can record its first expense
// immediately: the French chart-of-accounts categories, the system ledger, the
// structure identity sheet, and a catalogue already full of real aids. Every
// step is idempotent, because an app can be reinstalled.

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
