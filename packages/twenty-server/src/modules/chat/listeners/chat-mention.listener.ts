import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordCreateEvent } from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { ChatMentionService } from 'src/modules/chat/services/chat-mention.service';
import { type ChatMessageRecord } from 'src/modules/chat/services/chat-realtime-publisher.service';

// Only message creation fans out mention notifications: an edit does not
// re-notify (P8.2's mentions engine owns re-notification policy). Best-effort,
// like the realtime listener — a notification failure must never fail the
// message write, and the durable message row remains the source of truth.
@Injectable()
export class ChatMentionListener {
  private readonly logger = new Logger(ChatMentionListener.name);

  constructor(private readonly chatMentionService: ChatMentionService) {}

  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.CREATED)
  async handleMessageCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<ChatMessageRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      try {
        await this.chatMentionService.notifyMessageMentions({
          workspaceId: payload.workspaceId,
          message: event.properties.after,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to emit a chat mention notification: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }
}
