import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { CrossAppLifecycleEventListener } from 'src/modules/cross-app-events/listeners/cross-app-lifecycle-event.listener';
import { CrossAppEventEmitterService } from 'src/modules/cross-app-events/services/cross-app-event-emitter.service';

const buildBatch = (): WorkspaceEventBatch<never> =>
  ({
    name: 'document.created',
    workspaceId: 'workspace-id',
    objectMetadata: { nameSingular: 'document' } as FlatObjectMetadata,
    events: [{ recordId: 'document-id' }],
  }) as unknown as WorkspaceEventBatch<never>;

describe('CrossAppLifecycleEventListener', () => {
  let listener: CrossAppLifecycleEventListener;
  let crossAppEventEmitterService: {
    emitCrossAppEvents: jest.Mock;
  };

  beforeEach(() => {
    crossAppEventEmitterService = {
      emitCrossAppEvents: jest.fn().mockResolvedValue(undefined),
    };

    listener = new CrossAppLifecycleEventListener(
      crossAppEventEmitterService as unknown as CrossAppEventEmitterService,
    );
  });

  it('forwards created events to the projector with the object name', async () => {
    const payload = buildBatch();

    await listener.handleCreated(payload as never);

    expect(crossAppEventEmitterService.emitCrossAppEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-id',
        objectMetadataNameSingular: 'document',
        databaseAction: 'created',
      }),
    );
  });

  it('swallows projector failures so CRUD is never broken', async () => {
    crossAppEventEmitterService.emitCrossAppEvents.mockRejectedValue(
      new Error('projection failed'),
    );

    await expect(
      listener.handleUpdated(buildBatch() as never),
    ).resolves.toBeUndefined();
  });
});
