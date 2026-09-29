import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createMeetingNotesPage,
  type MeetingNotesPageResult,
} from './handlers/meeting-notes-page-handler.ts';

// The recipe input is declared inline (not imported) on purpose: the manifest
// builder infers a workflow-action inputSchema by parsing this source, and it
// only understands inline type literals. Keep it the first and only function in
// this file so the inference picks it up.
//
// Exposed as a workflow action, so « réunion → page de notes » is an ordinary
// Twenty workflow: the native database-event trigger fires it and the engine's
// logic-function action executes it. No second event bus.

const handler = async (params: {
  eventId: string;
  eventTitle?: string;
  workspaceId?: string;
}): Promise<MeetingNotesPageResult> =>
  createMeetingNotesPage(params, coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.meetingNotesPage,
  name: 'meeting-notes-page',
  description:
    'Crée la page de notes Bureau d’une réunion, idempotente par clé de corrélation : un rejeu du déclencheur ne duplique pas la page.',
  timeoutSeconds: 60,
  workflowActionTriggerSettings: {
    label: 'Créer la page de notes',
    icon: 'IconNotes',
  },
  handler,
});
