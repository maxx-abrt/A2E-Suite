import { defineLogicFunction } from 'twenty-sdk/define';

import {
  LOGIC_FUNCTION_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';
import type { ChatToolExecutionContext } from './handlers/chat-tool-support.ts';
import {
  summarizeChannel,
  type SummarizeChannelResult,
} from './handlers/summarize-channel-handler.ts';

export type { SummarizeChannelResult } from './handlers/summarize-channel-handler.ts';

// AI tool (P9.2): « résumer un canal / un fil ».
//
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no bespoke table, no manual hook. The handler is a real
// caller-scoped read: it returns the authorized recent messages plus
// participant and emoji-reaction stats, and never writes (C6). The private
// channel of a non-member fails closed with a typed denial.

const handler = async (
  params: { channelId: string; threadParentId?: string; maxMessages?: number },
  context: ChatToolExecutionContext,
): Promise<SummarizeChannelResult> =>
  summarizeChannel({
    channelId: params.channelId,
    threadParentId: params.threadParentId,
    maxMessages: params.maxMessages,
    callerWorkspaceMemberId: context.workspaceMemberId ?? null,
  });

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.summarizeChannel,
  name: 'summarize-channel',
  description:
    'Lit les messages récents d’un canal (ou d’un fil) auquel l’appelant a accès et renvoie le contenu, les participants et les réactions pour que l’assistant le résume. Lecture seule : un canal privé sans accès est refusé.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le canal à résumer et, en option, un fil précis et un nombre maximal de messages.',
      properties: {
        channelId: {
          type: 'string',
          objectUniversalIdentifier: OBJECT_IDS.channel,
          description: 'Identifiant du canal à résumer.',
        },
        threadParentId: {
          type: 'string',
          description:
            'Message parent du fil à résumer (optionnel ; absent = tout le canal).',
        },
        maxMessages: {
          type: 'number',
          description:
            'Nombre maximal de messages récents à lire (optionnel ; défaut 50, plafond 100).',
        },
      },
      required: ['channelId'],
    },
  },
  handler,
});
