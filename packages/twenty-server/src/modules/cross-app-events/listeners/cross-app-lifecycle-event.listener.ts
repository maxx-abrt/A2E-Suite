import { Injectable, Logger } from '@nestjs/common';

import { type ObjectRecordEvent } from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { CrossAppEventEmitterService } from 'src/modules/cross-app-events/services/cross-app-event-emitter.service';

// Hangs off every database event (one wildcard subscription per action, like
// the workflow and notification listeners) and forwards it to the contract
// projector. It never writes: emission on the notification path is the
// downstream subscriber's job.
@Injectable()
export class CrossAppLifecycleEventListener {
  private readonly logger = new Logger(CrossAppLifecycleEventListener.name);

  constructor(
    private readonly crossAppEventEmitterService: CrossAppEventEmitterService,
  ) {}

  @OnDatabaseBatchEvent('*', DatabaseEventAction.CREATED)
  async handleCreated(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.CREATED);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPDATED)
  async handleUpdated(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.UPDATED);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.DELETED)
  async handleDeleted(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.DELETED);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.DESTROYED)
  async handleDestroyed(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.DESTROYED);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.RESTORED)
  async handleRestored(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.RESTORED);
  }

  @OnDatabaseBatchEvent('*', DatabaseEventAction.UPSERTED)
  async handleUpserted(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
  ): Promise<void> {
    await this.emitSafely(payload, DatabaseEventAction.UPSERTED);
  }

  // A projector failure must never break the CRUD request that produced the
  // database event, so it is logged and swallowed like the watch fan-out.
  private async emitSafely(
    payload: WorkspaceEventBatch<ObjectRecordEvent>,
    databaseAction: DatabaseEventAction,
  ): Promise<void> {
    try {
      await this.crossAppEventEmitterService.emitCrossAppEvents({
        workspaceId: payload.workspaceId,
        objectMetadataNameSingular: payload.objectMetadata.nameSingular,
        databaseAction,
        events: payload.events,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to emit cross-app lifecycle events: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
