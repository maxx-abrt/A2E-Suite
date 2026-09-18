import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';

// AI tool seed (P4.3): « extraire les tâches d'un document ».
//
// This file only REGISTERS the tool on the native registry through
// `toolTriggerSettings` (P1.5) — no `registerAiTools`, no bespoke table, no
// manual hook. It stays deliberately inert: no LLM call and no task creation,
// so P9.2 can consume it (assistant) and replace the handler body with a real
// extraction that is reviewed and confirmed before any write (C6). The result
// carries an explicit `STUB_NOT_IMPLEMENTED` status so a caller can never
// mistake the empty proposal for a finished extraction.

export type ExtractTasksFromDocumentProposedTask = {
  title: string;
  description?: string;
};

export type ExtractTasksFromDocumentResult = {
  status: 'STUB_NOT_IMPLEMENTED';
  documentId: string;
  projectId: string | null;
  tasks: ExtractTasksFromDocumentProposedTask[];
};

const handler = async (params: {
  documentId: string;
  projectId?: string;
}): Promise<ExtractTasksFromDocumentResult> => ({
  status: 'STUB_NOT_IMPLEMENTED',
  documentId: params.documentId,
  projectId: params.projectId ?? null,
  tasks: [],
});

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.extractTasksFromDocument,
  name: 'extract-tasks-from-document',
  description:
    'Propose les tâches à créer à partir du contenu d’un document (amorçage P9 — lecture seule : aucune tâche n’est créée).',
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
