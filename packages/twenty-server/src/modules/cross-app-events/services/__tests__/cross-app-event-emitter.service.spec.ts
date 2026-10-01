import { ObjectRecordCreateEvent } from 'twenty-shared/database-events';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { WorkspaceEventEmitter } from 'src/engine/workspace-event-emitter/workspace-event-emitter';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { CROSS_APP_LIFECYCLE_EVENT } from 'src/modules/cross-app-events/constants/cross-app-lifecycle-event.constant';
import { CrossAppEventEmitterService } from 'src/modules/cross-app-events/services/cross-app-event-emitter.service';

const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

const buildDocumentCreateEvent = () =>
  Object.assign(new ObjectRecordCreateEvent(), {
    recordId: 'document-id',
    workspaceMemberId: 'workspace-member-id',
    properties: { after: { id: 'document-id' } },
  });

describe('CrossAppEventEmitterService', () => {
  let service: CrossAppEventEmitterService;
  let workspaceEventEmitter: {
    emitCustomBatchEvent: jest.Mock;
    emitDatabaseBatchEvent: jest.Mock;
  };
  let workspaceCacheService: { getOrRecompute: jest.Mock };

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

  beforeEach(() => {
    workspaceEventEmitter = {
      emitCustomBatchEvent: jest.fn(),
      emitDatabaseBatchEvent: jest.fn(),
    };
    workspaceCacheService = { getOrRecompute: jest.fn() };

    service = new CrossAppEventEmitterService(
      workspaceEventEmitter as unknown as WorkspaceEventEmitter,
      workspaceCacheService as unknown as WorkspaceCacheService,
    );
  });

  it('emits the projected events on the shared lifecycle channel', async () => {
    setInstalledApplications([A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER]);

    await service.emitCrossAppEvents({
      workspaceId: 'workspace-id',
      objectMetadataNameSingular: 'document',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildDocumentCreateEvent()],
    });

    expect(workspaceCacheService.getOrRecompute).toHaveBeenCalledWith(
      'workspace-id',
      ['flatApplicationMaps'],
    );
    expect(workspaceEventEmitter.emitCustomBatchEvent).toHaveBeenCalledWith(
      CROSS_APP_LIFECYCLE_EVENT,
      [
        expect.objectContaining({
          name: 'document.created',
          workspaceId: 'workspace-id',
          recordId: 'document-id',
        }),
      ],
      'workspace-id',
    );
  });

  it('does not emit when the family app is not installed', async () => {
    setInstalledApplications([]);

    await service.emitCrossAppEvents({
      workspaceId: 'workspace-id',
      objectMetadataNameSingular: 'document',
      databaseAction: DatabaseEventAction.CREATED,
      events: [buildDocumentCreateEvent()],
    });

    expect(workspaceEventEmitter.emitCustomBatchEvent).not.toHaveBeenCalled();
  });

  it('does not emit for objects outside the contract', async () => {
    setInstalledApplications([]);

    await service.emitCrossAppEvents({
      workspaceId: 'workspace-id',
      objectMetadataNameSingular: 'company',
      databaseAction: DatabaseEventAction.CREATED,
      events: [
        Object.assign(new ObjectRecordCreateEvent(), {
          recordId: 'company-id',
          properties: { after: { id: 'company-id' } },
        }),
      ],
    });

    expect(workspaceEventEmitter.emitCustomBatchEvent).not.toHaveBeenCalled();
    expect(workspaceCacheService.getOrRecompute).not.toHaveBeenCalled();
  });
});
