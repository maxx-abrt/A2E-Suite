import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  createDealWonChannel,
  coreClient,
  type DealWonCreateChannelResult,
} from './handlers/deal-won-create-channel-handler.ts';

// The recipe input is declared inline (not imported) on purpose: the manifest
// builder infers a workflow-action inputSchema by parsing this source, and it
// only understands inline type literals. Keep it the first and only function in
// this file so the inference picks it up.
//
// Optional-app step: the action is declared here so the channel step always
// resolves, and it degrades to an explicit `CHAT_NOT_INSTALLED` skip when A2E
// Chat is absent — the recipe hides the step at build time and the action skips
// safely at run time.

const handler = async (params: {
  projectId: string;
  projectName?: string;
  correlationKey?: string;
}): Promise<DealWonCreateChannelResult> =>
  createDealWonChannel(params, coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.dealWonCreateChannel,
  name: 'deal-won-create-channel',
  description:
    'Crée le canal A2E Chat relié au projet d’une affaire gagnée ; ignore l’étape avec une raison explicite si A2E Chat n’est pas installé.',
  timeoutSeconds: 60,
  workflowActionTriggerSettings: {
    label: 'Créer le canal du projet',
    icon: 'IconMessages',
  },
  handler,
});
