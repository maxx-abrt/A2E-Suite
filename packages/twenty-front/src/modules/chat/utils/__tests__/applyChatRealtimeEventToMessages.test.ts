import { type ChatMessage } from '@/chat/types/ChatMessage';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_MESSAGE_DELETED_EVENT_TYPE,
  CHAT_MESSAGE_UPDATED_EVENT_TYPE,
  CHAT_READ_UPDATED_EVENT_TYPE,
  CHAT_TYPING_EVENT_TYPE,
  type ChatRealtimeEvent,
  type ChatRealtimeMessage,
} from '@/chat/types/ChatRealtimeEvent';
import {
  applyChatRealtimeEventToMessages,
  getTypingWorkspaceMemberIdFromEvent,
  getUnreadCountOverrideFromEvent,
} from '@/chat/utils/applyChatRealtimeEventToMessages';

const buildMessage = (
  id: string,
  createdAt: string,
  overrides: Partial<ChatRealtimeMessage> = {},
): ChatRealtimeMessage => ({
  id,
  body: `body-${id}`,
  channelId: 'channel-1',
  authorId: 'member-1',
  threadParentId: null,
  createdAt,
  editedAt: null,
  deletedAt: null,
  ...overrides,
});

describe('applyChatRealtimeEventToMessages', () => {
  it('should append a created message in createdAt order', () => {
    const messages = [
      buildMessage('m1', '2026-01-01T01:00:00.000Z'),
      buildMessage('m3', '2026-01-01T03:00:00.000Z'),
    ];

    const nextMessages = applyChatRealtimeEventToMessages({
      messages,
      event: {
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        occurredAt: '2026-01-01T02:00:00.000Z',
        message: buildMessage('m2', '2026-01-01T02:00:00.000Z'),
      },
    });

    expect(nextMessages.map((message) => message.id)).toEqual([
      'm1',
      'm2',
      'm3',
    ]);
  });

  it('should replace an existing message on update without duplicating it', () => {
    const messages = [buildMessage('m1', '2026-01-01T01:00:00.000Z')];

    const nextMessages = applyChatRealtimeEventToMessages({
      messages,
      event: {
        type: CHAT_MESSAGE_UPDATED_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        occurredAt: '2026-01-01T01:00:00.000Z',
        message: buildMessage('m1', '2026-01-01T01:00:00.000Z', {
          body: 'edited',
          editedAt: '2026-01-01T01:05:00.000Z',
        }),
      },
    });

    expect(nextMessages).toHaveLength(1);
    expect(nextMessages[0].body).toBe('edited');
  });

  it('should drop a deleted message', () => {
    const messages = [
      buildMessage('m1', '2026-01-01T01:00:00.000Z'),
      buildMessage('m2', '2026-01-01T02:00:00.000Z'),
    ];

    const nextMessages = applyChatRealtimeEventToMessages({
      messages,
      event: {
        type: CHAT_MESSAGE_DELETED_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        occurredAt: '2026-01-01T03:00:00.000Z',
        message: buildMessage('m1', '2026-01-01T01:00:00.000Z', {
          deletedAt: '2026-01-01T03:00:00.000Z',
        }),
      },
    });

    expect(nextMessages.map((message) => message.id)).toEqual(['m2']);
  });

  it('should be idempotent when the optimistic replay and the server fan-out race', () => {
    const messages: ChatMessage[] = [];

    const event: ChatRealtimeEvent = {
      type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
      workspaceId: 'workspace-1',
      channelId: 'channel-1',
      occurredAt: '2026-01-01T01:00:00.000Z',
      message: buildMessage('optimistic-1', '2026-01-01T01:00:00.000Z'),
    };

    const afterFirstApply = applyChatRealtimeEventToMessages({
      messages,
      event,
    });
    const afterSecondApply = applyChatRealtimeEventToMessages({
      messages: afterFirstApply,
      event,
    });

    expect(afterSecondApply).toHaveLength(1);
  });

  it('should ignore non-message events', () => {
    const messages = [buildMessage('m1', '2026-01-01T01:00:00.000Z')];

    expect(
      applyChatRealtimeEventToMessages({
        messages,
        event: {
          type: CHAT_TYPING_EVENT_TYPE,
          workspaceId: 'workspace-1',
          channelId: 'channel-1',
          workspaceMemberId: 'member-2',
          isTyping: true,
          occurredAt: '2026-01-01T01:00:00.000Z',
        },
      }),
    ).toBe(messages);
  });
});

describe('getUnreadCountOverrideFromEvent', () => {
  it('should project the read event into a channel unread override', () => {
    expect(
      getUnreadCountOverrideFromEvent({
        type: CHAT_READ_UPDATED_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        occurredAt: '2026-01-01T01:00:00.000Z',
        read: {
          workspaceMemberId: 'member-2',
          lastReadMessageId: 'm1',
          lastReadAt: '2026-01-01T01:00:00.000Z',
          unreadCount: 0,
        },
      }),
    ).toEqual({ channelId: 'channel-1', unreadCount: 0 });
  });

  it('should return null for a message event', () => {
    expect(
      getUnreadCountOverrideFromEvent({
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        occurredAt: '2026-01-01T01:00:00.000Z',
        message: buildMessage('m1', '2026-01-01T01:00:00.000Z'),
      }),
    ).toBeNull();
  });
});

describe('getTypingWorkspaceMemberIdFromEvent', () => {
  it('should surface the member id only while typing started', () => {
    expect(
      getTypingWorkspaceMemberIdFromEvent({
        type: CHAT_TYPING_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        workspaceMemberId: 'member-2',
        isTyping: true,
        occurredAt: '2026-01-01T01:00:00.000Z',
      }),
    ).toBe('member-2');

    expect(
      getTypingWorkspaceMemberIdFromEvent({
        type: CHAT_TYPING_EVENT_TYPE,
        workspaceId: 'workspace-1',
        channelId: 'channel-1',
        workspaceMemberId: 'member-2',
        isTyping: false,
        occurredAt: '2026-01-01T01:00:00.000Z',
      }),
    ).toBeNull();
  });
});
