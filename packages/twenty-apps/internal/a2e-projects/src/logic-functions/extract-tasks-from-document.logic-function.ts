import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  extractTasksFromDocument,
  type ExtractTasksFromDocumentResult,
} from './handlers/extract-tasks-from-document-handler.ts';

export type {
  ExtractTasksFromDocumentProposedTask,
  ExtractTasksFromDocumentResult,
} from './handlers/extract-tasks-from-document-handler.ts';

// AI tool (P9.2): « extraire les tâches d'un document ».
//
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. The handler is a real
// deterministic extraction: it reads the document body by id under the
// caller's authorization and returns a draft of proposals. It never writes —
// creating the tasks after review is a separate confirmed action (C6).

const handler = async (params: {
  documentId: string;
  projectId?: string;
}): Promise<ExtractTasksFromDocumentResult> =>
  extractTasksFromDocument({
    documentId: params.documentId,
    projectId: params.projectId,
  });

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.extractTasksFromDocument,
  name: 'extract-tasks-from-document',
  description:
    'Propose les tâches à créer à partir du contenu d’un document (lecture seule : aucune tâche n’est créée, les propositions sont à valider).',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le document à analyser et, en option, le projet cible des tâches proposées.',
      properties: {
        documentId: {
          type: 'string',
          description: 'Identifiant du document à analyser.',
        },
        projectId: {
          type: 'string',
          description: 'Projet cible des tâches proposées (optionnel).',
        },
      },
      required: ['documentId'],
    },
  },
  handler,
});
