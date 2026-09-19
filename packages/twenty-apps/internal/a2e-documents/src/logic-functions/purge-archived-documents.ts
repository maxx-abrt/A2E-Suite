import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { purgeArchivedDocuments } from './handlers/purge-archived-documents-handler.ts';

// Trash purge. The sweep itself lives in the injectable handler so node:test
// can exercise paging/retention without a live Core API; this file only owns
// the cron wiring.
const handler = async () => {
  const result = await purgeArchivedDocuments();

  console.log('[a2e-documents] Corbeille purgée', result);

  return result;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.purgeArchivedDocuments,
  name: 'purge-archived-documents',
  description:
    'Détruit chaque nuit les documents archivés depuis plus de 7 jours.',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '0 4 * * *',
  },
  handler,
});
