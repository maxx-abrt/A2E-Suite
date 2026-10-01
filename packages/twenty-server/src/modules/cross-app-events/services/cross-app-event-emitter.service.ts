import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { type ObjectRecordEvent } from 'twenty-shared/database-events';
import { resolveCrossAppEventObjectFamily } from 'twenty-shared/cross-app-events';

import { type DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { CROSS_APP_LIFECYCLE_EVENT } from 'src/modules/cross-app-events/constants/cross-app-lifecycle-event.constant';
import { mapDatabaseEventToCrossAppEvents } from 'src/modules/cross-app-events/utils/map-database-event-to-cross-app-events.util';

export type EmitCrossAppEventsInput = {
  workspaceId: string;
  objectMetadataNameSingular: string;
  databaseAction: DatabaseEventAction;
  events: ObjectRecordEvent[];
};

// Projects the workspace database-event stream onto the shared cross-app
// contract and re-publishes it on one custom channel. It owns no event
// subscription itself; the listener feeds it, keeping the mapping pure and
// testable without a Nest context.
@Injectable()
export class CrossAppEventEmitterService {
  constructor(
    private readonly workspaceEventEmitter: WorkspaceEventEmitter,
    private readonly workspaceCacheService: WorkspaceCacheService,
  ) {}

  async emitCrossAppEvents({
    workspaceId,
    objectMetadataNameSingular,
    databaseAction,
    events,
  }: EmitCrossAppEventsInput): Promise<void> {
    // Every CRUD in the workspace raises a database event, so objects outside
    // the contract must be rejected before touching the workspace cache.
    if (
      resolveCrossAppEventObjectFamily(objectMetadataNameSingular) === undefined
    ) {
      return;
    }

    const { flatApplicationMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatApplicationMaps',
      ]);

    const installedApplicationUniversalIdentifiers = new Set(
      Object.keys(flatApplicationMaps.idByUniversalIdentifier).filter(
        isNonEmptyString,
      ),
    );

    const crossAppEvents = mapDatabaseEventToCrossAppEvents({
      objectMetadataNameSingular,
      databaseAction,
      workspaceId,
      events,
      isApplicationInstalled: (universalIdentifier) =>
        installedApplicationUniversalIdentifiers.has(universalIdentifier),
      occurredAt: new Date().toISOString(),
    });

    if (crossAppEvents.length === 0) {
      return;
    }

    this.workspaceEventEmitter.emitCustomBatchEvent(
      CROSS_APP_LIFECYCLE_EVENT,
      crossAppEvents,
      workspaceId,
    );
  }
}
