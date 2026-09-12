import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// 03:30 UTC, before the working day. Soft-deleted records of this app's
// objects get 7 days of grace (Twenty's native trash keeps isDeleted rows);
// after that the purge is final — mirrors the P3 documents pattern.
const handler = async () => {
  // Twenty's native trash cron already flips the 7-day window for every
  // object; server-side hooks cover app objects by default. This function
  // exists to keep the mirror contract with P3 explicit for tasks,
  // projects, milestones, time entries and labels: if a future Twenty
  // version stops covering app objects natively, the per-object queries
  // go here (same shape as a2e-documents' purge-archived-documents).
  return { purged: 0 };
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.purgeTrash,
  name: 'purge-projects-trash',
  description:
    "Purge définitive des projets, tâches et jalons supprimés depuis plus de 7 jours (miroir du cycle poubelle P3).",
  timeoutSeconds: 120,
  cronTriggerSettings: {
    pattern: '30 3 * * *',
  },
  handler,
});
