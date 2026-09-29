import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createFileReviewTask,
  type FileReviewTaskResult,
} from './handlers/file-review-task-handler.ts';

// The recipe input is declared inline (not imported) on purpose: the manifest
// builder infers a workflow-action inputSchema by parsing this source, and it
// only understands inline type literals. Keep it the first and only function in
// this file so the inference picks it up.
//
// Exposed as a workflow action, so « fichier déposé → tâche de relecture » is
// an ordinary Twenty workflow: the native database-event trigger fires it and
// the engine's logic-function action executes it. No second event bus.

const handler = async (params: {
  fileId: string;
  fileName?: string;
  projectId?: string;
  workspaceId?: string;
}): Promise<FileReviewTaskResult> =>
  createFileReviewTask(params, coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.fileReviewTask,
  name: 'file-review-task',
  description:
    'Crée la tâche de relecture d’un fichier déposé dans un projet, idempotente par clé de corrélation : un rejeu ne duplique pas la tâche.',
  timeoutSeconds: 60,
  workflowActionTriggerSettings: {
    label: 'Créer la tâche de relecture',
    icon: 'IconFileSearch',
  },
  handler,
});
