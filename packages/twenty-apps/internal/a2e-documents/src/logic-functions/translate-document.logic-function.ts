import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  runDocumentAction,
  type DocumentActionResult,
} from './handlers/document-action-handler.ts';

export type { DocumentActionResult } from './handlers/document-action-handler.ts';

// AI tool (P9.2): « traduire un document ».
//
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. The authorized read is
// the single US-013 `readDocumentContent` path; the assistant owns the
// translation and this tool never writes (C6). A missing target language is
// refused before any read.

const handler = async (params: {
  documentId: string;
  targetLanguage: string;
  tone?: string;
}): Promise<DocumentActionResult> =>
  runDocumentAction(
    {
      documentId: params.documentId,
      targetLanguage: params.targetLanguage,
      tone: params.tone,
    },
    'TRANSLATE',
  );

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.translateDocument,
  name: 'translate-document',
  description:
    'Lit le contenu autorisé d’un document et la langue cible demandée pour que l’assistant le traduise, avec un ton optionnel. Lecture seule : aucun contenu n’est modifié et un document sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le document à traduire, la langue cible et, en option, le ton souhaité.',
      properties: {
        documentId: {
          type: 'string',
          description: 'Identifiant du document à traduire.',
        },
        targetLanguage: {
          type: 'string',
          description: 'Langue cible de la traduction (par ex. « anglais »).',
        },
        tone: {
          type: 'string',
          description: 'Ton souhaité de la traduction (optionnel).',
        },
      },
      required: ['documentId', 'targetLanguage'],
    },
  },
  handler,
});
