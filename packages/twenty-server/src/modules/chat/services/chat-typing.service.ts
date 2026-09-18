import { Injectable } from '@nestjs/common';

import { RealtimePublisherService } from 'src/engine/core-modules/realtime-gateway/services/realtime-publisher.service';

import { buildChatChannelTopic } from '../utils/chat-topic.util';

export const CHAT_TYPING_EVENT_TYPE = 'chat.typing';

export type ChatTypingIndicator = {
  channelId: string;
  workspaceMemberId: string;
  isTyping: boolean;
  occurredAt: string;
};

// Typing is ephemeral: it is never persisted, only fanned out on the channel
// topic (`workspace:<id>:chat:<channelId>`). The mutation returns the
// indicator so a caller has an ack; the durable read state is the
// chatReadCursor record, not this payload.
@Injectable()
export class ChatTypingService {
  constructor(
    private readonly realtimePublisherService: RealtimePublisherService,
  ) {}

  async publishTypingIndicator({
    workspaceId,
    channelId,
    workspaceMemberId,
    isTyping,
  }: {
    workspaceId: string;
    channelId: string;
    workspaceMemberId: string;
    isTyping: boolean;
  }): Promise<ChatTypingIndicator> {
    const indicator: ChatTypingIndicator = {
      channelId,
      workspaceMemberId,
      isTyping,
      occurredAt: new Date().toISOString(),
    };

    await this.realtimePublisherService.publish(
      buildChatChannelTopic({ workspaceId, channelId }),
      {
        type: CHAT_TYPING_EVENT_TYPE,
        workspaceId,
        ...indicator,
      },
    );

    return indicator;
  }
}
