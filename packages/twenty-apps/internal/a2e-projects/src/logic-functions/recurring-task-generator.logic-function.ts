import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  coreClient,
  generateRecurringTasks,
} from './handlers/recurring-task-generator-handler.ts';

// The recurrence recipe is declared inline (not imported) on purpose: the
// manifest builder infers a workflow-action inputSchema by parsing this
// source, and it only understands inline type literals. Keep it the first and
// only function in this file so the inference picks it up.
//
// This logic function is exposed as a workflow action, so the recipe workflow
// below is an ordinary Twenty workflow: the native CRON trigger fires it and
// the engine's logic-function action executes it. No second scheduler.

const handler = async (params: {
  template: {
    title: string;
    projectId: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    startsAt: string;
    projectStatus?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  };
  window?: { from: string; to: string };
}) => generateRecurringTasks(params, new Date(), coreClient());

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.recurringTaskGenerator,
  name: 'recurring-task-generator',
  description:
    'Génère les tâches récurrentes dues : matérialise chaque occurrence de la recette dans le projet, sans doublon lors d’un rejeu.',
  timeoutSeconds: 120,
  workflowActionTriggerSettings: {
    label: 'Générer les tâches récurrentes',
    icon: 'IconCalendarRepeat',
  },
  handler,
});
