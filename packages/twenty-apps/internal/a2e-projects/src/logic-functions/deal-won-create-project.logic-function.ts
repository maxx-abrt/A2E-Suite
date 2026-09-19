import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createDealWonProject,
  type DealWonCreateProjectResult,
} from './handlers/deal-won-create-project-handler.ts';

// The recipe input is declared inline (not imported) on purpose: the manifest
// builder infers a workflow-action inputSchema by parsing this source, and it
// only understands inline type literals. Keep it the first and only function in
// this file so the inference picks it up.
//
// Exposed as a workflow action, so the « affaire gagnée » recipe is an ordinary
// Twenty workflow: the native database-event trigger fires it and the engine's
// logic-function action executes it. No second event bus.

const handler = async (params: {
  opportunityId: string;
  opportunityName?: string;
  companyId?: string;
  workspaceId?: string;
  actorId?: string;
}): Promise<DealWonCreateProjectResult> =>
  createDealWonProject(params, coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.dealWonCreateProject,
  name: 'deal-won-create-project',
  description:
    'Crée le projet d’une affaire gagnée, idempotent par clé de corrélation : un rejeu du déclencheur ne duplique pas le projet.',
  timeoutSeconds: 60,
  workflowActionTriggerSettings: {
    label: 'Créer le projet',
    icon: 'IconKanban',
  },
  handler,
});
