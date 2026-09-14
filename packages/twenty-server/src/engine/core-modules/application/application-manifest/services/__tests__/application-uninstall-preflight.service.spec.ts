import { Logger } from '@nestjs/common';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
import { ApplicationUninstallPreflightService } from 'src/engine/core-modules/application/application-manifest/services/application-uninstall-preflight.service';
import { ObjectRecordCountService } from 'src/engine/metadata-modules/object-metadata/object-record-count.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const buildFlatObjectMetadata = ({
  universalIdentifier,
  applicationId,
  applicationUniversalIdentifier,
  nameSingular,
}: {
  universalIdentifier: string;
  applicationId: string;
  applicationUniversalIdentifier: string;
  nameSingular: string;
}) => ({
  id: `id-${universalIdentifier}`,
  universalIdentifier,
  applicationId,
  applicationUniversalIdentifier,
  nameSingular,
});

const WORKSPACE_ID = 'workspace-1';
const APP_ID = 'app-1';
const APP_UNIVERSAL_IDENTIFIER = '11111111-1111-4111-8111-111111111111';
const OTHER_APP_UNIVERSAL_IDENTIFIER = '22222222-2222-4222-8222-222222222222';
const OTHER_APP_ID = 'other-app';
const OTHER_APP_NAME = 'Invoicing Companion';
const OTHER_APP_2_ID = 'other-app-2';

const buildFlatApplicationCacheMaps = (): FlatApplicationCacheMaps => ({
  byId: {
    [OTHER_APP_ID]: {
      id: OTHER_APP_ID,
      name: OTHER_APP_NAME,
    } as unknown as FlatApplication,
    [OTHER_APP_2_ID]: {
      id: OTHER_APP_2_ID,
      name: 'Standalone App',
    } as unknown as FlatApplication,
  },
  idByUniversalIdentifier: {
    [OTHER_APP_UNIVERSAL_IDENTIFIER]: OTHER_APP_ID,
  },
});

describe('ApplicationUninstallPreflightService', () => {
  let applicationService: ApplicationService;
  let workspaceCacheService: WorkspaceCacheService;
  let objectRecordCountService: ObjectRecordCountService;
  let preflightService: ApplicationUninstallPreflightService;

  const injectFlatMaps = ({
    flatObjectMetadataMaps,
    flatFieldMetadataMaps = { byUniversalIdentifier: {} },
    flatViewMaps = { byUniversalIdentifier: {} },
  }: {
    flatObjectMetadataMaps: { byUniversalIdentifier: Record<string, object> };
    flatFieldMetadataMaps?: { byUniversalIdentifier: Record<string, object> };
    flatViewMaps?: { byUniversalIdentifier: Record<string, object> };
  }) => {
    (workspaceCacheService.getOrRecompute as jest.Mock).mockResolvedValue({
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatViewMaps,
      flatApplicationMaps: buildFlatApplicationCacheMaps(),
    });
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    applicationService = {
      findOneApplicationOrThrow: jest.fn().mockResolvedValue({
        id: APP_ID,
        universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
        state: ApplicationState.INSTALLED,
      }),
    } as unknown as ApplicationService;

    workspaceCacheService = {
      getOrRecompute: jest.fn(),
    } as unknown as WorkspaceCacheService;

    objectRecordCountService = {
      getApproximateRecordCountByTableName: jest
        .fn()
        .mockResolvedValue(new Map()),
    } as unknown as ObjectRecordCountService;

    preflightService = new ApplicationUninstallPreflightService(
      applicationService,
      workspaceCacheService,
      objectRecordCountService,
    );
  });

  describe('computeUninstallImpact', () => {
    it('lists owned objects and their approximate record counts', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
            [OTHER_APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
              applicationId: 'other-app',
              applicationUniversalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'person',
            }),
          },
        },
      });

      // count maps are keyed by the derived live table name ('_'-prefixed
      // for non-standard apps), matching pg_class.relname
      (objectRecordCountService.getApproximateRecordCountByTableName as jest.Mock)
        .mockResolvedValue(new Map([['_invoice', 42]]));

      const impact = await preflightService.computeUninstallImpact({
        workspaceId: WORKSPACE_ID,
        applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      });

      expect(impact.ownedObjects).toEqual([
        {
          universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
          nameSingular: 'invoice',
        },
      ]);
      expect(impact.approximateRecordLossByObject).toEqual([
        { objectNameSingular: 'invoice', approximateCount: 42 },
      ]);
      expect(impact.ownedFieldsOnStandardObjects).toEqual([]);
      expect(impact.ownedViewsOnStandardObjects).toEqual([]);
    });

    it('reports app-owned fields and views attached to objects owned by other applications', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [OTHER_APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
              applicationId: 'other-app',
              applicationUniversalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'person',
            }),
          },
        },
        flatFieldMetadataMaps: {
          byUniversalIdentifier: {
            'field-owned': {
              universalIdentifier: 'field-owned',
              applicationId: APP_ID,
              name: 'trackingCode',
              objectMetadataUniversalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
            },
          },
        },
        flatViewMaps: {
          byUniversalIdentifier: {
            'view-owned': {
              universalIdentifier: 'view-owned',
              applicationId: APP_ID,
              name: 'Tracking view',
              objectMetadataUniversalIdentifier: OTHER_APP_UNIVERSAL_IDENTIFIER,
            },
          },
        },
      });

      const impact = await preflightService.computeUninstallImpact({
        workspaceId: WORKSPACE_ID,
        applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      });

      expect(impact.ownedFieldsOnStandardObjects).toEqual([
        {
          universalIdentifier: 'field-owned',
          objectNameSingular: 'person',
          fieldName: 'trackingCode',
        },
      ]);
      expect(impact.ownedViewsOnStandardObjects).toEqual([
        {
          universalIdentifier: 'view-owned',
          objectNameSingular: 'person',
          viewName: 'Tracking view',
        },
      ]);
    });

    it('lists cross-app dependents whose relation fields target owned objects', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
          },
        },
        flatFieldMetadataMaps: {
          byUniversalIdentifier: {
            'foreign-relation-field': {
              id: 'foreign-relation-field-id',
              universalIdentifier: 'foreign-relation-field',
              applicationId: OTHER_APP_ID,
              name: 'linkedInvoice',
              relationTargetObjectMetadataId: `id-${APP_UNIVERSAL_IDENTIFIER}`,
              relationTargetFieldMetadataId: null,
            },
            'self-relation-field': {
              id: 'self-relation-field-id',
              universalIdentifier: 'self-relation-field',
              applicationId: APP_ID,
              name: 'parentInvoice',
              relationTargetObjectMetadataId: `id-${APP_UNIVERSAL_IDENTIFIER}`,
              relationTargetFieldMetadataId: null,
            },
            'unrelated-relation-field': {
              id: 'unrelated-relation-field-id',
              universalIdentifier: 'unrelated-relation-field',
              applicationId: OTHER_APP_2_ID,
              name: 'linkedCompany',
              relationTargetObjectMetadataId: 'id-some-standard-object',
              relationTargetFieldMetadataId: null,
            },
          },
        },
      });

      const impact = await preflightService.computeUninstallImpact({
        workspaceId: WORKSPACE_ID,
        applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      });

      expect(impact.crossAppDependents).toEqual([
        {
          dependentApplicationName: OTHER_APP_NAME,
          dependency:
            "field 'linkedInvoice' (relation to object 'invoice')",
        },
      ]);
    });

    it('returns no cross-app dependents when no foreign relation targets owned objects', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
          },
        },
      });

      const impact = await preflightService.computeUninstallImpact({
        workspaceId: WORKSPACE_ID,
        applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      });

      expect(impact.crossAppDependents).toEqual([]);
    });
  });

  describe('assertUninstallAllowed', () => {
    it('refuses uninstall when owned objects still hold data', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
          },
        },
      });

      (objectRecordCountService.getApproximateRecordCountByTableName as jest.Mock)
        .mockResolvedValue(new Map([['_invoice', 7]]));

      await expect(
        preflightService.assertUninstallAllowed({
          workspaceId: WORKSPACE_ID,
          applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
        }),
      ).rejects.toMatchObject({
        code: ApplicationExceptionCode.FORBIDDEN,
        message: expect.stringContaining('still holds data'),
        userFriendlyMessage: expect.objectContaining({
          values: expect.objectContaining({
            objectsWithDataSummary: 'invoice',
          }),
        }),
      });
    });

    it('refuses uninstall when other applications depend on owned objects', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
          },
        },
        flatFieldMetadataMaps: {
          byUniversalIdentifier: {
            'foreign-relation-field': {
              id: 'foreign-relation-field-id',
              universalIdentifier: 'foreign-relation-field',
              applicationId: OTHER_APP_ID,
              name: 'linkedInvoice',
              relationTargetObjectMetadataId: `id-${APP_UNIVERSAL_IDENTIFIER}`,
              relationTargetFieldMetadataId: null,
            },
          },
        },
      });

      await expect(
        preflightService.assertUninstallAllowed({
          workspaceId: WORKSPACE_ID,
          applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
        }),
      ).rejects.toMatchObject({
        code: ApplicationExceptionCode.FORBIDDEN,
        message: expect.stringContaining(OTHER_APP_NAME),
        userFriendlyMessage: expect.objectContaining({
          values: expect.objectContaining({
            dependentSummary: expect.stringContaining(OTHER_APP_NAME),
          }),
        }),
      });
    });

    it('allows uninstall when owned objects are empty and returns the impact', async () => {
      injectFlatMaps({
        flatObjectMetadataMaps: {
          byUniversalIdentifier: {
            [APP_UNIVERSAL_IDENTIFIER]: buildFlatObjectMetadata({
              universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              applicationId: APP_ID,
              applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
              nameSingular: 'invoice',
            }),
          },
        },
      });

      const impact = await preflightService.assertUninstallAllowed({
        workspaceId: WORKSPACE_ID,
        applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
      });

      expect(impact.ownedObjects).toHaveLength(1);
      expect(impact.approximateRecordLossByObject).toEqual([
        { objectNameSingular: 'invoice', approximateCount: 0 },
      ]);
    });

    it('refuses uninstall for an application that is not installed', async () => {
      (applicationService.findOneApplicationOrThrow as jest.Mock).mockResolvedValue(
        {
          id: APP_ID,
          universalIdentifier: APP_UNIVERSAL_IDENTIFIER,
          state: ApplicationState.UNINSTALLING,
        },
      );

      await expect(
        preflightService.assertUninstallAllowed({
          workspaceId: WORKSPACE_ID,
          applicationUniversalIdentifier: APP_UNIVERSAL_IDENTIFIER,
        }),
      ).rejects.toBeInstanceOf(ApplicationException);
    });
  });
});
