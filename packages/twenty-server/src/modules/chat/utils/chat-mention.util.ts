import { isDefined } from 'twenty-shared/utils';

import { type NotificationRequest } from 'src/engine/core-modules/notification/types/notification-request.type';
import { type MentionTarget } from 'src/modules/mention/types/mention.type';
import { buildMentionNotificationPayload } from 'src/modules/mention/utils/build-mention-notification-payload.util';
import {
  extractChatMentionedWorkspaceMemberIds,
  parseChatMentions,
} from 'src/modules/mention/utils/parse-chat-mentions.util';

// Compatibility surface for the chat wire format now that the shared mentions
// engine (P8.2) owns parsing and payload building: these names delegate to the
// one parser instead of re-implementing the `@[label](workspaceMemberId)`
// pattern, so chat, docs and comments cannot drift.
export type ChatMentionTarget = MentionTarget;

export const extractMentionedWorkspaceMemberIds = (
  body: string | null,
): string[] => extractChatMentionedWorkspaceMemberIds(body);

export const buildChatMentionNotificationRequests = ({
  channelId,
  messageId,
  authorId,
  mentionedWorkspaceMemberIds,
  targets,
  createdAt,
  body,
}: {
  channelId: string;
  messageId: string;
  authorId: string | null;
  mentionedWorkspaceMemberIds: string[];
  targets: ChatMentionTarget[];
  createdAt?: Date;
  body?: string | null;
}): NotificationRequest[] => {
  const contextSnippet = isDefined(body)
    ? parseChatMentions(body).contextSnippet
    : '';

  return targets.map((target) => ({
    userId: target.userId,
    type: 'MENTION',
    payload: buildMentionNotificationPayload({
      source: { surface: 'chat', channelId, messageId },
      authorId,
      mentionedWorkspaceMemberIds,
      contextSnippet,
    }),
    // The message moment, not the batch flush time, keeps a replayed event in
    // the same digest window.
    ...(createdAt === undefined ? {} : { createdAt }),
  }));
};
