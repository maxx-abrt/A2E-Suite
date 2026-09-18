import { realtimeEnvelopeSchema } from 'src/engine/core-modules/realtime-gateway/types/realtime-envelope.type';
import { serializeRealtimeEnvelope } from 'src/engine/core-modules/realtime-gateway/utils/serialize-realtime-envelope.util';
import { parseRealtimeTopic } from 'src/engine/core-modules/realtime-gateway/utils/parse-realtime-topic.util';
import {
  CHAT_MESSAGE_CREATED_EVENT_TYPE,
  CHAT_READ_UPDATED_EVENT_TYPE,
  CHAT_REACTION_CREATED_EVENT_TYPE,
  buildChatMessageRealtimeEvent,
  buildChatReactionRealtimeEvent,
  buildChatReadRealtimeEvent,
} from 'src/modules/chat/utils/chat-realtime-event.util';
import { buildChatChannelTopic } from 'src/modules/chat/utils/chat-topic.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const MESSAGE_ID = 'c31c0300-0000-4000-8000-000000000000';
const WORKSPACE_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';
const OCCURRED_AT = '2026-09-18T19:24:14.000Z';

const message = {
  id: MESSAGE_ID,
  channelId: CHANNEL_ID,
  authorId: WORKSPACE_MEMBER_ID,
  body: 'hello',
  threadParentId: null,
  createdAt: OCCURRED_AT,
  editedAt: null,
  deletedAt: null,
};

describe('chat realtime event payloads', () => {
  it('names the message event topic in the gateway grammar', () => {
    const event = buildChatMessageRealtimeEvent({
      type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
      workspaceId: WORKSPACE_ID,
      message,
      occurredAt: OCCURRED_AT,
    });

    expect(
      parseRealtimeTopic(
        buildChatChannelTopic({
          workspaceId: event.workspaceId,
          channelId: event.channelId,
        }),
      ),
    ).toEqual({
      kind: 'chat',
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
    });
  });

  it('keeps the payload inside the shared realtime envelope contract', () => {
    const events = [
      buildChatMessageRealtimeEvent({
        type: CHAT_MESSAGE_CREATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        message,
        occurredAt: OCCURRED_AT,
      }),
      buildChatReactionRealtimeEvent({
        type: CHAT_REACTION_CREATED_EVENT_TYPE,
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        reaction: {
          id: 'reaction-1',
          messageId: MESSAGE_ID,
          workspaceMemberId: WORKSPACE_MEMBER_ID,
          emoji: '🎉',
        },
        occurredAt: OCCURRED_AT,
      }),
      buildChatReadRealtimeEvent({
        workspaceId: WORKSPACE_ID,
        channelId: CHANNEL_ID,
        read: {
          workspaceMemberId: WORKSPACE_MEMBER_ID,
          lastReadMessageId: MESSAGE_ID,
          lastReadAt: OCCURRED_AT,
          unreadCount: 2,
        },
        occurredAt: OCCURRED_AT,
      }),
    ];

    for (const event of events) {
      const serialized = serializeRealtimeEnvelope({
        topic: buildChatChannelTopic({
          workspaceId: event.workspaceId,
          channelId: event.channelId,
        }),
        seq: 0,
        type: 'event',
        payload: event,
      });
      const parsed = realtimeEnvelopeSchema.safeParse(JSON.parse(serialized));

      expect(parsed.success).toBe(true);
    }
  });

  it('emits the read event with its aggregated unread count', () => {
    const event = buildChatReadRealtimeEvent({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      read: {
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        lastReadMessageId: MESSAGE_ID,
        lastReadAt: OCCURRED_AT,
        unreadCount: 0,
      },
      occurredAt: OCCURRED_AT,
    });

    expect(event).toEqual({
      type: CHAT_READ_UPDATED_EVENT_TYPE,
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      occurredAt: OCCURRED_AT,
      read: {
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        lastReadMessageId: MESSAGE_ID,
        lastReadAt: OCCURRED_AT,
        unreadCount: 0,
      },
    });
  });
});
