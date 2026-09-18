import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  buildChatThreadReplyMap,
  getChatThreadReplyCount,
  getTopLevelChatMessages,
} from '@/chat/utils/buildChatThreadReplyMap';

const buildMessage = (
  overrides: Partial<ChatMessage> & Pick<ChatMessage, 'id'>,
): ChatMessage => ({
  body: 'body',
  channelId: 'channel-1',
  authorId: 'member-1',
  threadParentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  editedAt: null,
  ...overrides,
});

describe('buildChatThreadReplyMap', () => {
  it('should keep only replies in the map and order them oldest-first', () => {
    const repliesByParentId = buildChatThreadReplyMap([
      buildMessage({
        id: 'reply-late',
        threadParentId: 'parent',
        createdAt: '2026-01-01T03:00:00.000Z',
      }),
      buildMessage({ id: 'parent' }),
      buildMessage({
        id: 'reply-early',
        threadParentId: 'parent',
        createdAt: '2026-01-01T01:00:00.000Z',
      }),
    ]);

    expect(Object.keys(repliesByParentId)).toEqual(['parent']);
    expect(repliesByParentId.parent.map((reply) => reply.id)).toEqual([
      'reply-early',
      'reply-late',
    ]);
  });

  it('should count replies per parent', () => {
    const repliesByParentId = buildChatThreadReplyMap([
      buildMessage({ id: 'parent' }),
      buildMessage({ id: 'reply-1', threadParentId: 'parent' }),
      buildMessage({ id: 'reply-2', threadParentId: 'parent' }),
    ]);

    expect(getChatThreadReplyCount(repliesByParentId, 'parent')).toBe(2);
    expect(getChatThreadReplyCount(repliesByParentId, 'unknown')).toBe(0);
  });
});

describe('getTopLevelChatMessages', () => {
  it('should exclude replies and order top-level messages oldest-first', () => {
    const messages = getTopLevelChatMessages([
      buildMessage({ id: 'second', createdAt: '2026-01-01T02:00:00.000Z' }),
      buildMessage({
        id: 'reply',
        threadParentId: 'first',
        createdAt: '2026-01-01T01:30:00.000Z',
      }),
      buildMessage({ id: 'first', createdAt: '2026-01-01T01:00:00.000Z' }),
    ]);

    expect(messages.map((message) => message.id)).toEqual(['first', 'second']);
  });
});
