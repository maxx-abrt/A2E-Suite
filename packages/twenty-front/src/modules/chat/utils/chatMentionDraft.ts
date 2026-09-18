// Composer-side mention helpers over plain text. The wire format is fixed by
// the a2e-chat message body (`@[label](workspaceMemberId)`); the autocomplete
// only detects the trailing `@token` and swaps it for that markup.
const TRAILING_MENTION_QUERY_PATTERN = /(?:^|\s)@([^\s@]*)$/;

export const getChatMentionQueryFromDraft = (draft: string): string | null => {
  const match = draft.match(TRAILING_MENTION_QUERY_PATTERN);

  return match === null ? null : match[1];
};

export const buildChatMentionMarkup = (
  label: string,
  workspaceMemberId: string,
): string => `@[${label}](${workspaceMemberId})`;

export const insertChatMentionIntoDraft = ({
  draft,
  label,
  workspaceMemberId,
}: {
  draft: string;
  label: string;
  workspaceMemberId: string;
}): string => {
  const mention = buildChatMentionMarkup(label, workspaceMemberId);
  const match = draft.match(TRAILING_MENTION_QUERY_PATTERN);

  if (match === null) {
    const separator = draft.length > 0 && !draft.endsWith(' ') ? ' ' : '';

    return `${draft}${separator}${mention} `;
  }

  const tokenStartIndex = draft.length - match[0].length;
  const prefix = draft.slice(0, tokenStartIndex);
  const separator = match[0].startsWith(' ') ? ' ' : '';

  return `${prefix}${separator}${mention} `;
};
