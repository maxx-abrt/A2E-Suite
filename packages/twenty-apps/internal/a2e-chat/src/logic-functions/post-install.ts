import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { syncStarterChannels } from './handlers/starter-channels-handler.ts';

// INSTALL = READY TO TALK.
//
// Installing A2E Chat must leave a workspace with a default channel so a
// member can post immediately. The seeding is idempotent (by channel name),
// because an app can be reinstalled.

const handler = async () => {
  const result = await syncStarterChannels();

  console.log('[a2e-chat] Installation terminée', result);

  return result;
};

export default definePostInstallLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.postInstall,
  name: 'post-install',
  description: 'Prépare A2E Chat : canaux de démarrage (Général, Annonces).',
  timeoutSeconds: 120,
  shouldRunSynchronously: false,
  handler,
});
