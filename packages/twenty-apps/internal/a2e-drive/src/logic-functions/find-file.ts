import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  findDriveFile,
  type FindFileInput,
  type FindFileResult,
} from './handlers/find-file-handler.ts';

export type { FindFileResult } from './handlers/find-file-handler.ts';

// AI tool (P9.2): « trouve le PDF de facture de X ».
//
// Keyword + metadata search only (PLAN.md P9.2) — no embedding model, no LLM
// call. Registered on the native registry through `toolTriggerSettings` (P1.5)
// — no `registerAiTools`, no new table. Reads run under the caller's auth
// context via the Core API client and the tool never writes (C6). The ranking
// is deterministic: exact-prefix beats contains, then most-recent upload.

const handler = async (params: FindFileInput): Promise<FindFileResult> =>
  findDriveFile(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.findFile,
  name: 'find-file',
  description:
    'Cherche des fichiers Drive par mots-clés (nom, description, attribution, dossier) et métadonnées, puis renvoie les candidats classés avec un lien vers Drive. Lecture seule : aucun fichier n’est déplacé, renommé ou supprimé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'La requête de recherche de fichiers et, en option, des filtres de métadonnées (application source, dossier, type).',
      properties: {
        query: {
          type: 'string',
          description:
            'Mots-clés à chercher dans le nom, la description, l’attribution et le dossier.',
        },
        sourceApp: {
          type: 'string',
          description:
            'Filtre sur l’application source du fichier (optionnel).',
        },
        folderId: {
          type: 'string',
          description:
            'Filtre sur le dossier Drive contenant le fichier (optionnel).',
        },
        type: {
          type: 'string',
          description:
            'Filtre sur le type / mime / extension du fichier (optionnel).',
        },
      },
      required: ['query'],
    },
  },
  handler,
});
