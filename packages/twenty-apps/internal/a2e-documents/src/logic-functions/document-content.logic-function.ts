import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  readDocumentContent,
  type DocumentContentResult,
} from './handlers/document-content-handler.ts';

export type { DocumentContentResult } from './handlers/document-content-handler.ts';

// AI tool (P9.2): « lire le contenu autorisé d'un document ».
//
// The shared enabler for summarize / translate / improve-writing: one
// caller-scoped read instead of three duplicated read paths. The assistant
// owns the transformation; this tool owns the permission-checked data path.
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. It never writes (C6).

const handler = async (params: {
  documentId: string;
  includeMetadata?: boolean;
}): Promise<DocumentContentResult> =>
  readDocumentContent({
    documentId: params.documentId,
    includeMetadata: params.includeMetadata,
  });

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.documentContent,
  name: 'document-content',
  description:
    'Lit le contenu (corps blocknote) autorisé d’un document, avec en option ses métadonnées (titre, type, date de mise à jour), pour que l’assistant le résume, le traduise ou en améliore la rédaction. Lecture seule : aucun contenu n’est modifié et un document sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le document à lire et, en option, l’inclusion de ses métadonnées.',
      properties: {
        documentId: {
          type: 'string',
          description: 'Identifiant du document à lire.',
        },
        includeMetadata: {
          type: 'boolean',
          description:
            'Inclure le titre, le type et la date de mise à jour (optionnel ; défaut vrai).',
        },
      },
      required: ['documentId'],
    },
  },
  handler,
});
