import { type ChatMessageBodySegment } from '@/chat/types/ChatMessage';

const MENTION_PATTERN = /@\[([^\]]*)\]\(([^)\s]+)\)/g;

// Mirrors the a2e-chat composer wire format (`@[label](workspaceMemberId)`,
// packages/twenty-apps/internal/a2e-chat/src/lib/message-body.ts). Rendering
// splits it into text/mention segments so mentions can be styled without a
// second message format or an HTML pipeline.
export const splitChatMessageBody = (
  body: string,
): ChatMessageBodySegment[] => {
  const segments: ChatMessageBodySegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, matchIndex) });
    }

    segments.push({
      type: 'mention',
      value: match[1],
      workspaceMemberId: match[2],
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }

  return segments;
};
