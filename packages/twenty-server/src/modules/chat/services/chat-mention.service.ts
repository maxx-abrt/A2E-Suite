import { Injectable } from '@nestjs/common';

import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';
import { MentionNotificationService } from 'src/modules/mention/services/mention-notification.service';

// The chat arm of the shared mentions engine (P8.2): it only maps a saved chat
// message onto the engine's source/body contract, so parsing, member→user
// resolution, private-channel permission filtering and the snippet are owned by
// one place across docs, chat and comments.
@Injectable()
export class ChatMentionService {
  constructor(
    private readonly mentionNotificationService: MentionNotificationService,
  ) {}

  async notifyMessageMentions({
    workspaceId,
    message,
  }: {
    workspaceId: string;
    message: ChatMessageRecord;
  }): Promise<void> {
    await this.mentionNotificationService.notifyMentions({
      workspaceId,
      source: {
        surface: 'chat',
        channelId: message.channelId,
        messageId: message.id,
      },
      body: message.body,
      authorId: message.authorId,
      createdAt: new Date(message.createdAt),
    });
  }
}
