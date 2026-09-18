import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  getChatReadState,
  isChatChannelUnread,
} from '@/chat/utils/getChatReadState';

const buildMessage = (id: string, createdAt: string): ChatMessage => ({
  id,
  body: 'body',
  channelId: 'channel-1',
  authorId: 'member-1',
  threadParentId: null,
  createdAt,
  editedAt: null,
});

const messages = [
  buildMessage('m3', '2026-01-01T03:00:00.000Z'),
  buildMessage('m1', '2026-01-01T01:00:00.000Z'),
  buildMessage('m2', '2026-01-01T02:00:00.000Z'),
];

describe('getChatReadState', () => {
  it('should put the divider before the first message when nothing was read', () => {
    expect(getChatReadState({ messages, lastReadMessageId: null })).toEqual({
      firstUnreadMessageId: 'm1',
    });
  });

  it('should put the divider before the message after the read cursor', () => {
    expect(getChatReadState({ messages, lastReadMessageId: 'm2' })).toEqual({
      firstUnreadMessageId: 'm3',
    });
  });

  it('should report no divider when the whole channel is read', () => {
    expect(getChatReadState({ messages, lastReadMessageId: 'm3' })).toEqual({
      firstUnreadMessageId: null,
    });
  });

  it('should report no divider when the cursor no longer resolves', () => {
    expect(
      getChatReadState({ messages, lastReadMessageId: 'deleted' }),
    ).toEqual({ firstUnreadMessageId: null });
  });
});

describe('isChatChannelUnread', () => {
  it('should treat a positive count as unread', () => {
    expect(isChatChannelUnread(3)).toBe(true);
    expect(isChatChannelUnread(0)).toBe(false);
  });
});
