import { Injectable, Logger } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type NotificationWatchTargetKind } from 'src/engine/core-modules/notification/constants/notification-watch-target-kind.constant';
import { NotificationWatchService } from 'src/engine/core-modules/notification/services/notification-watch.service';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';

// A watched record, projected from the raw database event. Only `id` and the
// event's `updatedFields` are read; everything else in the row is irrelevant to
// the fan-out.
type WatchedRecord = { id: string };

// The standard workspace objects a member can watch. Each carries one of these
// decorator-bound handlers (the event emitter is per-object), while the fan-out
// itself is one shared primitive — no per-object watch systems.
const WATCHED_RECORD_OBJECT_NAMES = [
  'document',
  'note',
  'task',
  'opportunity',
  'company',
  'person',
] as const;

type WatchedRecordObjectName = (typeof WATCHED_RECORD_OBJECT_NAMES)[number];

// Watch fan-out. It hangs off the metadata engine's database events (the CRUD is
// generated) exactly like ChatRealtimeListener, resolves the target's watchers
// through NotificationWatchService and lets the P8.1 seam own delivery. A
// document event carries the document target kind; other objects carry the
// record kind with their own object name for the inbox deep link. Channel
// watches ride the chatMessage create event.
@Injectable()
export class NotificationWatchListener {
  private readonly logger = new Logger(NotificationWatchListener.name);

  constructor(
    private readonly notificationWatchService: NotificationWatchService,
  ) {}

  @OnDatabaseBatchEvent('document', DatabaseEventAction.CREATED)
  async handleDocumentCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyCreated({ payload, objectName: 'document' });
  }

  // An update only fires when a watched field actually changed, so re-saving an
  // unchanged record does not re-notify.
  @OnDatabaseBatchEvent('document', DatabaseEventAction.UPDATED)
  async handleDocumentUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'document' });
  }

  @OnDatabaseBatchEvent('note', DatabaseEventAction.UPDATED)
  async handleNoteUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'note' });
  }

  @OnDatabaseBatchEvent('task', DatabaseEventAction.UPDATED)
  async handleTaskUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'task' });
  }

  @OnDatabaseBatchEvent('opportunity', DatabaseEventAction.UPDATED)
  async handleOpportunityUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'opportunity' });
  }

  @OnDatabaseBatchEvent('company', DatabaseEventAction.UPDATED)
  async handleCompanyUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'company' });
  }

  @OnDatabaseBatchEvent('person', DatabaseEventAction.UPDATED)
  async handlePersonUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>,
  ): Promise<void> {
    await this.notifyUpdated({ payload, objectName: 'person' });
  }

  // A channel watch fires on every new message.
  @OnDatabaseBatchEvent('chatMessage', DatabaseEventAction.CREATED)
  async handleChatMessageCreated(
    payload: WorkspaceEventBatch<
      ObjectRecordCreateEvent<WatchedRecord & { channelId?: string | null }>
    >,
  ): Promise<void> {
    for (const event of payload.events) {
      const channelId = event.properties.after.channelId;

      if (typeof channelId !== 'string' || channelId.length === 0) {
        continue;
      }

      await this.notifySafely(() =>
        this.notificationWatchService.notifyWatchersOfChange({
          workspaceId: payload.workspaceId,
          targetKind: 'CHANNEL',
          targetId: channelId,
        }),
      );
    }
  }

  private async notifyCreated({
    payload,
    objectName,
  }: {
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<WatchedRecord>>;
    objectName: WatchedRecordObjectName;
  }): Promise<void> {
    for (const event of payload.events) {
      await this.notifySafely(() =>
        this.notificationWatchService.notifyWatchersOfChange({
          workspaceId: payload.workspaceId,
          targetKind: resolveTargetKind(objectName),
          targetId: event.properties.after.id,
          objectNameSingular: objectName,
        }),
      );
    }
  }

  private async notifyUpdated({
    payload,
    objectName,
  }: {
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<WatchedRecord>>;
    objectName: WatchedRecordObjectName;
  }): Promise<void> {
    for (const event of payload.events) {
      await this.notifySafely(() =>
        this.notificationWatchService.notifyWatchersOfChange({
          workspaceId: payload.workspaceId,
          targetKind: resolveTargetKind(objectName),
          targetId: event.properties.after.id,
          objectNameSingular: objectName,
          changedFieldNames: event.properties.updatedFields,
        }),
      );
    }
  }

  private async notifySafely(notify: () => Promise<string[]>): Promise<void> {
    try {
      await notify();
    } catch (error) {
      this.logger.warn(
        `Failed to notify watchers: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}

export const resolveTargetKind = (
  objectName: WatchedRecordObjectName,
): NotificationWatchTargetKind =>
  objectName === 'document' ? 'DOCUMENT' : 'RECORD';
