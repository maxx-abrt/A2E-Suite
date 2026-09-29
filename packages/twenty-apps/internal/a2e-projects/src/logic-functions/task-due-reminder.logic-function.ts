import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  createTaskDueReminder,
  type TaskDueReminderResult,
} from './handlers/task-due-reminder-handler.ts';

// The recipe input is declared inline (not imported) on purpose: the manifest
// builder infers a workflow-action inputSchema by parsing this source, and it
// only understands inline type literals. Keep it the first and only function in
// this file so the inference picks it up.
//
// Exposed as a workflow action, so « tâche à échéance → rappel Agenda » is an
// ordinary Twenty workflow: the native database-event trigger fires it and the
// engine's logic-function action executes it. The reminder itself reuses the
// calendar's native `reminderMinutes` primitive — no second notification engine.

const handler = async (params: {
  taskId: string;
  taskTitle?: string;
  dueAt?: string;
  workspaceId?: string;
}): Promise<TaskDueReminderResult> =>
  createTaskDueReminder(params, coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.taskDueReminder,
  name: 'task-due-reminder',
  description:
    'Crée le rappel Agenda d’une tâche à échéance via la primitive de rappel du calendrier natif, idempotent par clé de corrélation.',
  timeoutSeconds: 60,
  workflowActionTriggerSettings: {
    label: 'Créer le rappel Agenda',
    icon: 'IconBell',
  },
  handler,
});
