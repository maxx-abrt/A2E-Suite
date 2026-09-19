import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  buildDedupeHints,
  type DedupeHintsInput,
  type DedupeHintsResult,
} from './handlers/dedupe-hints-handler.ts';

export type { DedupeHintsResult } from './handlers/dedupe-hints-handler.ts';

// AI tool (P9.2): « signale les doublons probables ».
//
// Groups attachments by normalized name + extension (and folder when present).
// `attachment` has no byte size and no content hash, so this never pretends to
// compare sizes or hashes (phase-06-report P6.2). Registered on the native
// registry through `toolTriggerSettings` (P1.5) — no `registerAiTools`, no new
// table — and strictly read-only: it never moves, renames or deletes (C6).

const handler = async (params: DedupeHintsInput): Promise<DedupeHintsResult> =>
  buildDedupeHints(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.dedupeHints,
  name: 'dedupe-hints',
  description:
    'Regroupe les pièces jointes qui partagent un nom et une extension normalisés (et le même dossier le cas échéant) et renvoie les groupes avec leurs identifiants, pour signaler les doublons probables. Lecture seule : rien n’est déplacé, renommé ou supprimé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Déduplique les fichiers Drive et, en option, limite l’analyse à un dossier.',
      properties: {
        folderId: {
          type: 'string',
          description:
            'Limiter la recherche de doublons à ce dossier Drive (optionnel).',
        },
      },
    },
  },
  handler,
});
