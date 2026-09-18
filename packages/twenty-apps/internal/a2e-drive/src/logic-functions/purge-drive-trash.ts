import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { purgeDriveExpiredTrash } from './handlers/purge-drive-trash-handler.ts';

// Trash purge trigger. Archived files and folders live 7 days for restore,
// then the cron destroys them. Mirrors purge-archived-documents / projects.
export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.purgeDriveTrash,
  name: 'purge-drive-trash',
  description:
    'Détruit chaque nuit les fichiers et dossiers archivés depuis plus de 7 jours.',
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '0 3 * * *',
  },
  handler: async () => purgeDriveExpiredTrash(),
});
