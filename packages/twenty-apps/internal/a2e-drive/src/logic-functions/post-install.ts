import { CoreApiClient } from 'twenty-client-sdk/core';
import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { seedFolderStructures } from './handlers/seed-folder-structures-handler.ts';

// INSTALL = READY TO FILE.
//
// Installing Archive must leave a workspace with the four persona folder
// structures already built (client, association, étudiant, administration
// d'entreprise), so a new user files into an organised tree instead of a blank
// one. Every step is idempotent, because an app can be reinstalled.

const coreClient = (): CoreApiClient => new CoreApiClient();

const handler = async () => {
  const client = coreClient();

  const folderStructures = await seedFolderStructures(client);

  console.log('[a2e-drive] Installation terminée', folderStructures);

  return {
    folderStructureTemplatesCreated: folderStructures.templatesCreated,
    foldersCreated: folderStructures.foldersCreated,
  };
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description:
    'Prépare Archive : quatre arborescences de dossiers de démarrage (client, association, étudiant, administration d’entreprise).',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
