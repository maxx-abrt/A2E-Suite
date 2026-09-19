import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  buildStandupDigestForAssistant,
  type StandupDigestInput,
  type StandupDigestResult,
} from './handlers/standup-digest-handler.ts';

export type { StandupDigestResult } from './handlers/standup-digest-handler.ts';

// AI tool (P9.2): « prépare le point du jour ».
//
// Assembles a standup digest — tasks completed, created, still-open-edited and
// overdue — from the task rows read under the caller's authorization. The
// window defaults to the previous local day; an explicit `sinceIso` or a
// `projectId` narrows it. Registered on the native registry through
// `toolTriggerSettings` (P1.5) — no `registerAiTools`, no new table — and
// strictly read-only (C6): the digest is context, never an update.

const handler = async (
  params: StandupDigestInput,
): Promise<StandupDigestResult> => buildStandupDigestForAssistant(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.standupDigest,
  name: 'standup-digest',
  description:
    'Rassemble le point du jour d’un projet ou de l’espace : tâches terminées, créées, encore ouvertes modifiées et en retard depuis le début de la fenêtre (par défaut la veille). Lecture seule : aucune tâche n’est créée ni modifiée.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le point du jour : fenêtre temporelle optionnelle et projet optionnel.',
      properties: {
        sinceIso: {
          type: 'string',
          description:
            'Début de la fenêtre en ISO 8601 (optionnel ; par défaut le début du jour local précédent).',
        },
        projectId: {
          type: 'string',
          description:
            'Limiter le point du jour à ce projet (optionnel ; par défaut tout l’espace).',
        },
      },
    },
  },
  handler,
});
