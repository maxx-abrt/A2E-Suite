import { type EventEmitter2 } from '@nestjs/event-emitter';

import {
  ObjectRecordCreateEvent,
  ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';
import {
  isCrossAppEventPayload,
  type CrossAppEventPayload,
} from 'twenty-shared/cross-app-events';

import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { CROSS_APP_LIFECYCLE_EVENT } from 'src/modules/cross-app-events/constants/cross-app-lifecycle-event.constant';
import { CrossAppLifecycleEventListener } from 'src/modules/cross-app-events/listeners/cross-app-lifecycle-event.listener';
import { CrossAppEventEmitterService } from 'src/modules/cross-app-events/services/cross-app-event-emitter.service';

const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

// Exercises the real listener -> service -> mapper -> emitter chain (only the
// Nest container and the workspace cache are faked), so the contract shape and
// the install gating are asserted on the exact payload a subscriber receives.
describe('cross-app lifecycle contract (module integration)', () => {
  let eventEmitter: { emit: jest.Mock };
  let workspaceEventEmitter: WorkspaceEventEmitter;
  let workspaceCacheService: { getOrRecompute: jest.Mock };
  let listener: CrossAppLifecycleEventListener;

  const setInstalledApplications = (universalIdentifiers: string[]) => {
    workspaceCacheService.getOrRecompute.mockResolvedValue({
      flatApplicationMaps: {
        byId: {},
        idByUniversalIdentifier: Object.fromEntries(
          universalIdentifiers.map((universalIdentifier, index) => [
            universalIdentifier,
            `application-${index}`,
          ]),
        ),
      },
    });
  };

  const readEmittedPayloads = (): CrossAppEventPayload[] => {
    const lifecycleCall = eventEmitter.emit.mock.calls.find(
      ([eventName]) => eventName === CROSS_APP_LIFECYCLE_EVENT,
    );

    return (lifecycleCall?.[1]?.events ?? []) as CrossAppEventPayload[];
  };

  const buildBatch = ({
    nameSingular,
    name,
    events,
  }: {
    nameSingular: string;
    name: string;
    events: unknown[];
  }): WorkspaceEventBatch<never> =>
    ({
      name,
      workspaceId: 'workspace-id',
      objectMetadata: { nameSingular } as FlatObjectMetadata,
      events,
    }) as unknown as WorkspaceEventBatch<never>;

  beforeEach(() => {
    eventEmitter = { emit: jest.fn() };
    workspaceEventEmitter = new WorkspaceEventEmitter(
      eventEmitter as unknown as EventEmitter2,
    );
    workspaceCacheService = { getOrRecompute: jest.fn() };

    const crossAppEventEmitterService = new CrossAppEventEmitterService(
      workspaceEventEmitter,
      workspaceCacheService as unknown as WorkspaceCacheService,
    );

    listener = new CrossAppLifecycleEventListener(crossAppEventEmitterService);
  });

  it('emits a schema-valid document.created event when the app is installed', async () => {
    setInstalledApplications([A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER]);

    await listener.handleCreated(
      buildBatch({
        nameSingular: 'document',
        name: 'document.created',
        events: [
          Object.assign(new ObjectRecordCreateEvent(), {
            recordId: 'document-id',
            workspaceMemberId: 'workspace-member-id',
            properties: { after: { id: 'document-id' } },
          }),
        ],
      }) as never,
    );

    const payloads = readEmittedPayloads();

    expect(payloads).toHaveLength(1);
    expect(isCrossAppEventPayload(payloads[0])).toBe(true);
    expect(payloads[0].name).toBe('document.created');
  });

  it('emits task.completed when a task reaches its done status', async () => {
    setInstalledApplications([]);

    await listener.handleUpdated(
      buildBatch({
        nameSingular: 'task',
        name: 'task.updated',
        events: [
          Object.assign(new ObjectRecordUpdateEvent(), {
            recordId: 'task-id',
            properties: {
              before: { id: 'task-id', status: 'IN_PROGRESS' },
              after: { id: 'task-id', status: 'DONE' },
              updatedFields: ['status'],
              diff: {},
            },
          }),
        ],
      }) as never,
    );

    const payloads = readEmittedPayloads();

    expect(payloads[0].name).toBe('task.completed');
    expect(isCrossAppEventPayload(payloads[0])).toBe(true);
  });

  it('emits nothing for an object of an uninstalled optional app', async () => {
    setInstalledApplications([]);

    await listener.handleCreated(
      buildBatch({
        nameSingular: 'document',
        name: 'document.created',
        events: [
          Object.assign(new ObjectRecordCreateEvent(), {
            recordId: 'document-id',
            properties: { after: { id: 'document-id' } },
          }),
        ],
      }) as never,
    );

    expect(readEmittedPayloads()).toHaveLength(0);
  });

  it('emits nothing for objects outside the contract', async () => {
    setInstalledApplications([]);

    await listener.handleCreated(
      buildBatch({
        nameSingular: 'company',
        name: 'company.created',
        events: [
          Object.assign(new ObjectRecordCreateEvent(), {
            recordId: 'company-id',
            properties: { after: { id: 'company-id' } },
          }),
        ],
      }) as never,
    );

    expect(readEmittedPayloads()).toHaveLength(0);
    expect(workspaceCacheService.getOrRecompute).not.toHaveBeenCalled();
  });
});
