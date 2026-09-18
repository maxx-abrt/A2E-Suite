// Markdown-lite message handling. The body is stored as plain text; mentions
// are encoded inline as @[label](workspaceMemberId) so the notification leg
// (P5.1 mentions) can parse them without a second message format.

export const MAX_MESSAGE_BODY_LENGTH = 4000;

const MENTION_PATTERN = /@\[[^\]]*\]\(([^)\s]+)\)/g;

export const normalizeMessageBody = (body: string): string =>
  body.replace(/\r\n/g, '\n').trim();

export const isMessageBodyWithinLimit = (body: string): boolean =>
  normalizeMessageBody(body).length <= MAX_MESSAGE_BODY_LENGTH;

export const extractMentionedWorkspaceMemberIds = (body: string): string[] => {
  const matches = normalizeMessageBody(body).matchAll(MENTION_PATTERN);
  const ids = new Set<string>();

  for (const match of matches) {
    const workspaceMemberId = match[1];

    if (workspaceMemberId.length > 0) {
      ids.add(workspaceMemberId);
    }
  }

  return [...ids];
};
