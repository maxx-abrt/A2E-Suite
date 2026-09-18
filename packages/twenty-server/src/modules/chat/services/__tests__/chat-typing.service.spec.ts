import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';
import {
  CHAT_TYPING_EVENT_TYPE,
  ChatTypingService,
} from 'src/modules/chat/services/chat-typing.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const CHANNEL_ID = 'c31c0100-0000-4000-8000-000000000000';
const WORKSPACE_MEMBER_ID = '20202020-77d5-4cb6-b60a-f4a835a85d61';

const buildPublisherMock = (): {
  publisher: RealtimePublisherService;
  publish: jest.Mock;
} => {
  const publish = jest.fn().mockResolvedValue(undefined);

  return {
    publisher: { publish } as unknown as RealtimePublisherService,
    publish,
  };
};

describe('ChatTypingService.publishTypingIndicator', () => {
  it('fans the typing event out on the channel topic', async () => {
    const { publisher, publish } = buildPublisherMock();
    const service = new ChatTypingService(publisher);

    await service.publishTypingIndicator({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      isTyping: true,
    });

    expect(publish).toHaveBeenCalledWith(
      `workspace:${WORKSPACE_ID}:chat:${CHANNEL_ID}`,
      expect.objectContaining({
        type: CHAT_TYPING_EVENT_TYPE,
        channelId: CHANNEL_ID,
        workspaceMemberId: WORKSPACE_MEMBER_ID,
        isTyping: true,
      }),
    );
  });

  it('returns the same indicator it published, with an occurrence time', async () => {
    const { publisher, publish } = buildPublisherMock();
    const service = new ChatTypingService(publisher);

    const indicator = await service.publishTypingIndicator({
      workspaceId: WORKSPACE_ID,
      channelId: CHANNEL_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      isTyping: false,
    });

    expect(indicator).toEqual({
      channelId: CHANNEL_ID,
      workspaceMemberId: WORKSPACE_MEMBER_ID,
      isTyping: false,
      occurredAt: expect.any(String),
    });

    const [, payload] = publish.mock.calls[0] as [
      string,
      { occurredAt: string },
    ];

    expect(payload.occurredAt).toBe(indicator.occurredAt);
  });
});
