import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { purgeExpiredTrash } from './handlers/purge-trash-handler.ts';

// 03:30 UTC, before the working day. Archived project items (projects, jalons,
// temps, étiquettes) keep 7 days of grace to be restored, then the cron
// destroys them — mirrors the P3 documents pattern (purge-archived-documents).
// Standard tasks keep Twenty's native trash cleanup, see the handler.
const handler = async () => {
  const result = await purgeExpiredTrash();

  console.log('[a2e-projects] Corbeille purgée', result);

  return result;
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.purgeTrash,
  name: 'purge-projects-trash',
  description:
    'Purge définitive des projets, jalons, temps et étiquettes archivés depuis plus de 7 jours (miroir du cycle poubelle P3).',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '30 3 * * *',
  },
  handler,
});
