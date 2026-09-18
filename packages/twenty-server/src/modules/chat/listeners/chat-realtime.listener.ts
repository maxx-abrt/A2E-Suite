import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordDeleteEvent,
  type ObjectRecordDestroyEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import {
  type ChatMessageRecord,
  type ChatReadCursorRecord,
  type ChatReactionRecord,
  ChatRealtimePublisherService,
} from 'src/modules/chat/services/chat-realtime-publisher.service';

// Bridges the metadata engine's database events for the app-owned chat objects
// onto the channel topic. The CRUD is generated, so this listener — not a
// resolver — is where the realtime fan-out hangs. Publishing is best-effort:
// a fan-out failure must never fail the message/reaction/read write that
// triggered it, and the durable rows remain the catch-up source.
@Injectable()
export class ChatRealtimeListener {
  private readonly logger = new Logger(ChatRealtimeListener.name);

  constructor(
    private readonly chatRealtimePublisherService: ChatRealtimePublisherService,
  ) {}

  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.CREATED)
  async handleMessageCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<ChatMessageRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishMessageEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.CREATED,
          message: event.properties.after,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.UPDATED)
  async handleMessageUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<ChatMessageRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishMessageEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.UPDATED,
          message: event.properties.after,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.DELETED)
  async handleMessageDeleted(
    payload: WorkspaceEventBatch<ObjectRecordDeleteEvent<ChatMessageRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishMessageEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.DELETED,
          message: event.properties.after ?? event.properties.before,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.DESTROYED)
  async handleMessageDestroyed(
    payload: WorkspaceEventBatch<ObjectRecordDestroyEvent<ChatMessageRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishMessageEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.DESTROYED,
          message: event.properties.before,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatReaction', DatabaseEventAction.CREATED)
  async handleReactionCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<ChatReactionRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishReactionEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.CREATED,
          reaction: event.properties.after,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatReaction', DatabaseEventAction.DELETED)
  async handleReactionDeleted(
    payload: WorkspaceEventBatch<ObjectRecordDeleteEvent<ChatReactionRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishReactionEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.DELETED,
          reaction: event.properties.after ?? event.properties.before,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatReaction', DatabaseEventAction.DESTROYED)
  async handleReactionDestroyed(
    payload: WorkspaceEventBatch<ObjectRecordDestroyEvent<ChatReactionRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishReactionEvent({
          workspaceId: payload.workspaceId,
          action: DatabaseEventAction.DESTROYED,
          reaction: event.properties.before,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatReadCursor', DatabaseEventAction.CREATED)
  async handleReadCursorCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<ChatReadCursorRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishReadEvent({
          workspaceId: payload.workspaceId,
          record: event.properties.after,
        }),
      );
    }
  }

  @OnDatabaseBatchEvent('chatReadCursor', DatabaseEventAction.UPDATED)
  async handleReadCursorUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<ChatReadCursorRecord>>,
  ): Promise<void> {
    for (const event of payload.events) {
      await this.publishSafely(() =>
        this.chatRealtimePublisherService.publishReadEvent({
          workspaceId: payload.workspaceId,
          record: event.properties.after,
        }),
      );
    }
  }

  private async publishSafely(publish: () => Promise<void>): Promise<void> {
    try {
      await publish();
    } catch (error) {
      this.logger.warn(
        `Failed to publish a chat realtime event: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
