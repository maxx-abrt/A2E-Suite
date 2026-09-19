import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import type { ChatToolExecutionContext } from './handlers/chat-tool-support.ts';
import {
  catchMeUp,
  type CatchMeUpResult,
} from './handlers/catch-me-up-handler.ts';

export type { CatchMeUpResult } from './handlers/catch-me-up-handler.ts';

// AI tool (P9.2): « rattrape-moi ».
//
// Returns the caller's unread backlog in one authorized channel. With no
// `sinceIso` the window starts after the caller's durable `chatReadCursor`
// (P5.1); an explicit ISO date overrides it. Registered on the native registry
// through `toolTriggerSettings` (P1.5) and strictly read-only: the cursor is
// never advanced here (C6).

const handler = async (
  params: { channelId: string; sinceIso?: string },
  context: ChatToolExecutionContext,
): Promise<CatchMeUpResult> =>
  catchMeUp({
    channelId: params.channelId,
    sinceIso: params.sinceIso,
    callerWorkspaceMemberId: context.workspaceMemberId ?? null,
  });

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.catchMeUp,
  name: 'catch-me-up',
  description:
    'Renvoie les messages non lus de l’appelant dans un canal auquel il a accès, depuis son dernier curseur de lecture. Lecture seule : le curseur n’est jamais modifié et un canal privé sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le canal à rattraper et, en option, une date ISO de départ explicite.',
      properties: {
        channelId: {
          type: 'string',
          description: 'Identifiant du canal dont on veut les non-lus.',
        },
        sinceIso: {
          type: 'string',
          description:
            'Date ISO de début explicite (optionnel ; par défaut, le curseur de lecture de l’appelant).',
        },
      },
      required: ['channelId'],
    },
  },
  handler,
});
