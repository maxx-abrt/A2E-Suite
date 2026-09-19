import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  runDocumentAction,
  type DocumentActionResult,
} from './handlers/document-action-handler.ts';

export type { DocumentActionResult } from './handlers/document-action-handler.ts';

// AI tool (P9.2): « résumer un document ».
//
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. The authorized read is
// the single US-013 `readDocumentContent` path; the assistant owns the summary
// and this tool never writes (C6).

const handler = async (params: {
  documentId: string;
  maxWords?: number;
}): Promise<DocumentActionResult> =>
  runDocumentAction(
    { documentId: params.documentId, maxWords: params.maxWords },
    'SUMMARIZE',
  );

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.summarizeDocument,
  name: 'summarize-document',
  description:
    'Lit le contenu autorisé d’un document pour que l’assistant le résume, avec un budget de mots optionnel. Lecture seule : aucun contenu n’est modifié et un document sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le document à résumer et, en option, un budget de mots pour le résumé.',
      properties: {
        documentId: {
          type: 'string',
          description: 'Identifiant du document à résumer.',
        },
        maxWords: {
          type: 'number',
          description:
            'Longueur cible du résumé en mots (optionnel ; entier entre 1 et 2000).',
        },
      },
      required: ['documentId'],
    },
  },
  handler,
});
