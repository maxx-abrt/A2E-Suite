import { type MentionExtraction } from 'src/modules/mention/types/mention.type';
import {
  normalizeMentionSnippetText,
  truncateMentionSnippet,
} from 'src/modules/mention/utils/build-mention-snippet.util';

// Markdown-lite mention wire format shared with the a2e-chat composer:
// `@[label](workspaceMemberId)`. Kept here as the chat arm of the shared
// mentions parser so the composer format has exactly one reader.
export const CHAT_MENTION_PATTERN = /@\[([^\]]*)\]\(([^)\s]+)\)/g;

export const extractChatMentionedWorkspaceMemberIds = (
  body: string | null,
): string[] => {
  if (body === null) {
    return [];
  }

  const ids = new Set<string>();

  for (const match of body.matchAll(CHAT_MENTION_PATTERN)) {
    if (match[2].length > 0) {
      ids.add(match[2]);
    }
  }

  return [...ids];
};

export const renderChatMentionLabels = (body: string): string =>
  body.replace(CHAT_MENTION_PATTERN, (_match, label: string) =>
    label.length > 0 ? `@${label}` : '@',
  );

export const parseChatMentions = (body: string | null): MentionExtraction => {
  const mentionedWorkspaceMemberIds =
    extractChatMentionedWorkspaceMemberIds(body);

  if (body === null || mentionedWorkspaceMemberIds.length === 0) {
    return { mentionedWorkspaceMemberIds, contextSnippet: '' };
  }

  return {
    mentionedWorkspaceMemberIds,
    contextSnippet: truncateMentionSnippet(
      normalizeMentionSnippetText(renderChatMentionLabels(body)),
    ),
  };
};
