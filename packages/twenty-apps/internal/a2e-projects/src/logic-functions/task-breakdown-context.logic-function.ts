import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  buildTaskBreakdownContextForAssistant,
  type TaskBreakdownContextInput,
  type TaskBreakdownContextResult,
} from './handlers/task-breakdown-context-handler.ts';

export type { TaskBreakdownContextResult } from './handlers/task-breakdown-context-handler.ts';

// AI tool (P9.2): « donne la structure des tâches du projet ».
//
// Returns the context an assistant needs to PROPOSE a task breakdown — the
// project's task tree, its milestones and the pipeline status counts — read
// under the caller's authorization. The tool proposes nothing itself and never
// creates a task (C6): the assistant renders suggestions from this shape.
// Registered on the native registry through `toolTriggerSettings` (P1.5).

const handler = async (
  params: TaskBreakdownContextInput,
): Promise<TaskBreakdownContextResult> =>
  buildTaskBreakdownContextForAssistant(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.taskBreakdownContext,
  name: 'task-breakdown-context',
  description:
    'Renvoie la structure des tâches d’un projet — arborescence parent/enfants via la relation parentTask, jalons avec leurs dates et compteurs par statut — le contexte nécessaire pour proposer une décomposition. Lecture seule : aucune tâche ni jalon n’est créé ou modifié, la décomposition est proposée par l’assistant.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le projet dont on veut la structure des tâches et les jalons.',
      properties: {
        projectId: {
          type: 'string',
          description: 'Identifiant du projet à analyser.',
        },
      },
      required: ['projectId'],
    },
  },
  handler,
});
