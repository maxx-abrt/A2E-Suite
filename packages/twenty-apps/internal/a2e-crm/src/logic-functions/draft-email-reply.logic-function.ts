import { defineLogicFunction } from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  buildEmailReplyDraft,
  type EmailReplyDraftResult,
} from './handlers/draft-email-reply-handler.ts';

export type { EmailReplyDraftResult } from './handlers/draft-email-reply-handler.ts';

// AI tool (P9.2): « brouillon de réponse e-mail ».
//
// Reads the caller-authorized message thread plus the validated drafting
// options; the assistant writes the reply. This tool never sends, never stores
// a draft message and never writes anything (C6: review before any commit).
// Registered on the native registry through `toolTriggerSettings` (P1.5) — no
// `registerAiTools`, no new table, no manual hook.

const handler = async (params: {
  messageThreadId: string;
  tone?: string;
  language?: string;
  maxWords?: number;
}): Promise<EmailReplyDraftResult> => buildEmailReplyDraft(params);

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.draftEmailReply,
  name: 'draft-email-reply',
  description:
    'Lit un fil e-mail autorisé pour que l’assistant rédige un brouillon de réponse, avec un ton, une langue et un budget de mots optionnels. Lecture seule : rien n’est envoyé ni enregistré et un fil sans accès est refusé. La réponse reste à valider avant tout envoi.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      description:
        'Le fil e-mail à répondre et, en option, le ton, la langue et la longueur cible du brouillon.',
      properties: {
        messageThreadId: {
          type: 'string',
          description: 'Identifiant du fil e-mail auquel répondre.',
        },
        tone: {
          type: 'string',
          description: 'Ton souhaité de la réponse (optionnel).',
        },
        language: {
          type: 'string',
          description: 'Langue de la réponse (optionnel).',
        },
        maxWords: {
          type: 'number',
          description:
            'Longueur cible de la réponse en mots (optionnel ; entier entre 1 et 2000).',
        },
      },
      required: ['messageThreadId'],
    },
  },
  handler,
});
