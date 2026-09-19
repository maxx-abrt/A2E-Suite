import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  runDocumentAction,
  type DocumentActionResult,
} from './handlers/document-action-handler.ts';

export type { DocumentActionResult } from './handlers/document-action-handler.ts';

// AI tool (P9.2): « améliorer la rédaction d'un document ».
//
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. The authorized read is
// the single US-013 `readDocumentContent` path; the assistant owns the rewrite
// proposal and this tool never writes (C6). Applying an improved text is a
// separate confirmed mutation.

const handler = async (params: {
  documentId: string;
  tone?: string;
}): Promise<DocumentActionResult> =>
  runDocumentAction(
    { documentId: params.documentId, tone: params.tone },
    'IMPROVE_WRITING',
  );

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.improveDocumentWriting,
  name: 'improve-document-writing',
  description:
    'Lit le contenu autorisé d’un document pour que l’assistant en propose une rédaction améliorée, avec un ton optionnel. Lecture seule : aucun contenu n’est modifié et un document sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le document à améliorer et, en option, le ton souhaité.',
      properties: {
        documentId: {
          type: 'string',
          description: 'Identifiant du document à améliorer.',
        },
        tone: {
          type: 'string',
          description:
            'Ton souhaité de la réécriture (optionnel ; par ex. « concis », « formel »).',
        },
      },
      required: ['documentId'],
    },
  },
  handler,
});
