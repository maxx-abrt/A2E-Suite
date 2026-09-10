import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import { refreshSubventions } from './handlers/refresh-subventions-handler.ts';

// 04:10 UTC: after the nightly publications of the public portals, before the
// working day. The whole catalogue in one tick, idempotent by design.
export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.refreshSubventions,
  name: 'refresh-subventions',
  description:
    "Rafraîchit chaque nuit le catalogue de subventions depuis Aides-territoires, Carenews et la liste des dispositifs nationaux référencés. Idempotent : une aide inchangée n'est pas réécrite.",
  timeoutSeconds: 300,
  cronTriggerSettings: {
    pattern: '10 4 * * *',
  },
  handler: async () => refreshSubventions(),
});
