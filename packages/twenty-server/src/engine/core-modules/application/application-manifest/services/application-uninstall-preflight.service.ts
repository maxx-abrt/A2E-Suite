import { Injectable, Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { ObjectRecordCountService } from 'src/engine/metadata-modules/object-metadata/object-record-count.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

type UninstallImpact = {
  ownedObjects: { universalIdentifier: string; nameSingular: string }[];
  ownedFieldsOnStandardObjects: {
    universalIdentifier: string;
    objectNameSingular: string;
    fieldName: string;
  }[];
  ownedViewsOnStandardObjects: {
    universalIdentifier: string;
    objectNameSingular: string;
    viewName: string;
  }[];
  approximateRecordLossByObject: {
    objectNameSingular: string;
    approximateCount: number;
  }[];
};

@Injectable()
export class ApplicationUninstallPreflightService {
  private readonly logger = new Logger(
    ApplicationUninstallPreflightService.name,
  );

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly objectRecordCountService: ObjectRecordCountService,
  ) {}

  async computeUninstallImpact({
    workspaceId,
    applicationUniversalIdentifier,
  }: {
    workspaceId: string;
    applicationUniversalIdentifier: string;
  }): Promise<UninstallImpact> {
    const application =
      await this.applicationService.findOneApplicationOrThrow({
        universalIdentifier: applicationUniversalIdentifier,
        workspaceId,
      });

    const { flatObjectMetadataMaps, flatFieldMetadataMaps, flatViewMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
        'flatViewMaps',
      ]);

    const flatObjectMetadatas = Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    ).filter(isDefined);

    const ownedObjects = flatObjectMetadatas.filter(
      (flatObjectMetadata) =>
        flatObjectMetadata.applicationId === application.id,
    );

    const ownedObjectUniversalIdentifiers = new Set(
      ownedObjects.map((object) => object.universalIdentifier),
    );

    const objectNameSingularByUniversalIdentifier = new Map(
      flatObjectMetadatas.map((flatObjectMetadata) => [
        flatObjectMetadata.universalIdentifier,
        flatObjectMetadata.nameSingular,
      ]),
    );

    const ownedFieldsOnStandardObjects = Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (flatFieldMetadata) =>
          flatFieldMetadata.applicationId === application.id &&
          isDefined(flatFieldMetadata.objectMetadataUniversalIdentifier) &&
          !ownedObjectUniversalIdentifiers.has(
            flatFieldMetadata.objectMetadataUniversalIdentifier,
          ),
      )
      .flatMap((flatFieldMetadata) => {
        const objectNameSingular =
          objectNameSingularByUniversalIdentifier.get(
            flatFieldMetadata.objectMetadataUniversalIdentifier,
          );

        if (!isDefined(objectNameSingular)) {
          return [];
        }

        return [
          {
            universalIdentifier: flatFieldMetadata.universalIdentifier,
            objectNameSingular,
            fieldName: flatFieldMetadata.name,
          },
        ];
      });

    const ownedViewsOnStandardObjects = Object.values(
      flatViewMaps.byUniversalIdentifier,
    )
      .filter(isDefined)
      .filter(
        (flatView) =>
          flatView.applicationId === application.id &&
          isDefined(flatView.objectMetadataUniversalIdentifier) &&
          !ownedObjectUniversalIdentifiers.has(
            flatView.objectMetadataUniversalIdentifier,
          ),
      )
      .flatMap((flatView) => {
        const objectNameSingular =
          objectNameSingularByUniversalIdentifier.get(
            flatView.objectMetadataUniversalIdentifier,
          );

        if (!isDefined(objectNameSingular)) {
          return [];
        }

        return [
          {
            universalIdentifier: flatView.universalIdentifier,
            objectNameSingular,
            viewName: flatView.name,
          },
        ];
      });

    const approximateCountByTableName =
      await this.objectRecordCountService.getApproximateRecordCountByTableName(
        workspaceId,
      );

    // targetTableName is a deprecated column with stale values; the live
    // table name is derived, matching how getRecordCounts counts records.
    const approximateRecordLossByObject = ownedObjects.map(
      (flatObjectMetadata) => ({
        objectNameSingular: flatObjectMetadata.nameSingular,
        approximateCount:
          approximateCountByTableName.get(
            computeObjectTargetTable(flatObjectMetadata),
          ) ?? 0,
      }),
    );

    return {
      ownedObjects: ownedObjects.map((flatObjectMetadata) => ({
        universalIdentifier: flatObjectMetadata.universalIdentifier,
        nameSingular: flatObjectMetadata.nameSingular,
      })),
      ownedFieldsOnStandardObjects,
      ownedViewsOnStandardObjects,
      approximateRecordLossByObject,
    };
  }

  async assertUninstallAllowed({
    workspaceId,
    applicationUniversalIdentifier,
  }: {
    workspaceId: string;
    applicationUniversalIdentifier: string;
  }): Promise<UninstallImpact> {
    const application =
      await this.applicationService.findOneApplicationOrThrow({
        universalIdentifier: applicationUniversalIdentifier,
        workspaceId,
      });

    if (application.state !== ApplicationState.INSTALLED) {
      throw new ApplicationException(
        `Application ${applicationUniversalIdentifier} is not in a removable state (${application.state})`,
        ApplicationExceptionCode.FORBIDDEN,
      );
    }

    const impact = await this.computeUninstallImpact({
      workspaceId,
      applicationUniversalIdentifier,
    });

    const objectsWithData = impact.approximateRecordLossByObject
      .filter(({ approximateCount }) => approximateCount > 0)
      .map(({ objectNameSingular }) => objectNameSingular);

    // C3: no supported export/retention path exists yet, so removing an app
    // holding data is refused rather than presented as a safe action. Hide
    // (navigation preference) remains the supported containment.
    if (objectsWithData.length > 0) {
      throw new ApplicationException(
        `Application ${applicationUniversalIdentifier} still holds data in objects: ${objectsWithData.join(', ')}. Export the data or empty the objects before uninstalling.`,
        ApplicationExceptionCode.FORBIDDEN,
      );
    }

    return impact;
  }
}
