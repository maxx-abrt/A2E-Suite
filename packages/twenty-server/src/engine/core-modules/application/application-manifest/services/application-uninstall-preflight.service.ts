import { Injectable, Logger } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { computeObjectTargetTable } from 'src/engine/utils/compute-object-target-table.util';

import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { type FlatFieldMetadataMaps } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata-maps.type';
import { type FlatObjectMetadataMaps } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata-maps.type';

import {
  ApplicationException,
  ApplicationExceptionCode,
} from 'src/engine/core-modules/application/application.exception';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { ApplicationState } from 'src/engine/core-modules/application/enums/application-state.enum';
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
  crossAppDependents: {
    dependentApplicationName: string;
    dependency: string;
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

  private computeCrossAppDependents({
    applicationId,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    flatApplicationMaps,
  }: {
    applicationId: string;
    flatObjectMetadataMaps: FlatObjectMetadataMaps;
    flatFieldMetadataMaps: FlatFieldMetadataMaps;
    flatApplicationMaps: FlatApplicationCacheMaps;
  }): UninstallImpact['crossAppDependents'] {
    // Another app depends on this one when its relation field targets one of
    // this app's objects — uninstalling drops the target side and leaves the
    // dependent app's field dangling.
    const ownedObjectById = new Map(
      Object.values(flatObjectMetadataMaps.byUniversalIdentifier)
        .filter(isDefined)
        .filter(
          (flatObjectMetadata) =>
            flatObjectMetadata.applicationId === applicationId,
        )
        .map((flatObjectMetadata) => [flatObjectMetadata.id, flatObjectMetadata]),
    );

    const ownedFieldById = new Map(
      Object.values(flatFieldMetadataMaps.byUniversalIdentifier)
        .filter(isDefined)
        .filter(
          (flatFieldMetadata) =>
            flatFieldMetadata.applicationId === applicationId,
        )
        .map((flatFieldMetadata) => [flatFieldMetadata.id, flatFieldMetadata]),
    );

    const dependenciesByApplicationId = new Map<string, Set<string>>();

    for (const flatFieldMetadata of Object.values(
      flatFieldMetadataMaps.byUniversalIdentifier,
    )) {
      if (
        !isDefined(flatFieldMetadata) ||
        flatFieldMetadata.applicationId === applicationId ||
        !isDefined(flatFieldMetadata.relationTargetObjectMetadataId)
      ) {
        continue;
      }

      const targetObject = ownedObjectById.get(
        flatFieldMetadata.relationTargetObjectMetadataId,
      );

      if (!isDefined(targetObject)) {
        continue;
      }

      const targetField = isDefined(
        flatFieldMetadata.relationTargetFieldMetadataId,
      )
        ? ownedFieldById.get(flatFieldMetadata.relationTargetFieldMetadataId)
        : undefined;

      const dependency = isDefined(targetField)
        ? `field '${flatFieldMetadata.name}' (relation to '${targetObject.nameSingular}.${targetField.name}')`
        : `field '${flatFieldMetadata.name}' (relation to object '${targetObject.nameSingular}')`;

      const dependencies =
        dependenciesByApplicationId.get(flatFieldMetadata.applicationId) ??
        new Set<string>();

      dependencies.add(dependency);
      dependenciesByApplicationId.set(
        flatFieldMetadata.applicationId,
        dependencies,
      );
    }

    return [...dependenciesByApplicationId.entries()].flatMap(
      ([dependentApplicationId, dependencies]) => {
        const dependentApplication =
          flatApplicationMaps.byId[dependentApplicationId];

        if (!isDefined(dependentApplication)) {
          return [];
        }

        return [...dependencies].map((dependency) => ({
          dependentApplicationName: dependentApplication.name,
          dependency,
        }));
      },
    );
  }

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

    const {
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatViewMaps,
      flatApplicationMaps,
    } = await this.workspaceCacheService.getOrRecompute(workspaceId, [
      'flatObjectMetadataMaps',
      'flatFieldMetadataMaps',
      'flatViewMaps',
      'flatApplicationMaps',
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

    const crossAppDependents = this.computeCrossAppDependents({
      applicationId: application.id,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatApplicationMaps,
    });

    return {
      ownedObjects: ownedObjects.map((flatObjectMetadata) => ({
        universalIdentifier: flatObjectMetadata.universalIdentifier,
        nameSingular: flatObjectMetadata.nameSingular,
      })),
      ownedFieldsOnStandardObjects,
      ownedViewsOnStandardObjects,
      approximateRecordLossByObject,
      crossAppDependents,
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
    const objectsWithDataSummary = objectsWithData.join(', ');

    if (objectsWithData.length > 0) {
      throw new ApplicationException(
        `Application ${applicationUniversalIdentifier} still holds data in objects: ${objectsWithDataSummary}. Export the data or empty the objects before uninstalling.`,
        ApplicationExceptionCode.FORBIDDEN,
        {
          // The generic FORBIDDEN fallback ("no permission") is misleading
          // here: the caller IS allowed, the removal is blocked by C3.
          userFriendlyMessage: msg`Uninstall is blocked because this application still holds data (${objectsWithDataSummary}). Export or delete these records first: uninstalling deletes them permanently, and reinstalling will not restore them. To keep the data while hiding the app, remove it from your navigation instead.`,
        },
      );
    }

    // C3 dependency preflight: name dependent apps so the refusal is
    // actionable (detach/impact preview is a later explicit contract).
    if (impact.crossAppDependents.length > 0) {
      const dependentsByName = new Map<string, string[]>();

      for (const { dependentApplicationName, dependency } of impact.crossAppDependents) {
        const dependencies =
          dependentsByName.get(dependentApplicationName) ?? [];

        dependencies.push(dependency);
        dependentsByName.set(dependentApplicationName, dependencies);
      }

      const dependentSummary = [...dependentsByName.entries()]
        .map(
          ([dependentApplicationName, dependencies]) =>
            `${dependentApplicationName} (${dependencies.join('; ')})`,
        )
        .join(', ');

      throw new ApplicationException(
        `Application ${applicationUniversalIdentifier} cannot be uninstalled because other applications depend on it: ${dependentSummary}.`,
        ApplicationExceptionCode.FORBIDDEN,
        {
          userFriendlyMessage: msg`This application cannot be uninstalled because other applications depend on it: ${dependentSummary}. Uninstall or detach the dependent applications first.`,
        },
      );
    }

    return impact;
  }
}
