import { isDefined } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { addFlatEntityToFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/add-flat-entity-to-flat-entity-maps-or-throw.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { isMorphOrRelationFlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-morph-or-relation-flat-field-metadata.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';

// The application-scoped schema (SDK client generation, introspection) keeps
// only the standard + requested application object/field metadata. A relation
// field can legitimately target an object owned by another application (e.g.
// A2E Projects' `project.documents` targeting A2E Documents' `document`), and
// the schema generator throws when that target object is missing from the
// generation context. Pull the missing relation targets (and their fields,
// transitively) from the full maps so the generators can resolve them, while
// leaving the guard untouched for genuinely unresolvable targets.
export const augmentFlatEntityMapsWithRelationTargets = ({
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  allFlatObjectMetadataMaps,
  allFlatFieldMetadataMaps,
}: {
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  allFlatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  allFlatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}): {
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
} => {
  let augmentedObjectMetadataMaps = flatObjectMetadataMaps;
  let augmentedFieldMetadataMaps = flatFieldMetadataMaps;

  const objectMetadataIdsToVisit = Object.values(
    flatObjectMetadataMaps.byUniversalIdentifier,
  )
    .filter(isDefined)
    .map((objectMetadata) => objectMetadata.id);

  const visitedObjectMetadataIds = new Set<string>();

  while (objectMetadataIdsToVisit.length > 0) {
    const objectMetadataId = objectMetadataIdsToVisit.pop();

    if (
      !isDefined(objectMetadataId) ||
      visitedObjectMetadataIds.has(objectMetadataId)
    ) {
      continue;
    }

    visitedObjectMetadataIds.add(objectMetadataId);

    const objectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: objectMetadataId,
      flatEntityMaps: augmentedObjectMetadataMaps,
    });

    if (!isDefined(objectMetadata)) {
      continue;
    }

    const fieldMetadata = getFlatFieldsFromFlatObjectMetadata(
      objectMetadata,
      augmentedFieldMetadataMaps,
    );

    for (const field of fieldMetadata) {
      if (!isMorphOrRelationFlatFieldMetadata(field)) {
        continue;
      }

      const relationTargetObjectMetadataId =
        field.relationTargetObjectMetadataId;

      if (!isDefined(relationTargetObjectMetadataId)) {
        continue;
      }

      const alreadyIncludedTarget = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: relationTargetObjectMetadataId,
        flatEntityMaps: augmentedObjectMetadataMaps,
      });

      if (isDefined(alreadyIncludedTarget)) {
        continue;
      }

      const targetObjectMetadata = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: relationTargetObjectMetadataId,
        flatEntityMaps: allFlatObjectMetadataMaps,
      });

      // Genuinely missing target: leave it out so the schema generator guard
      // still fires on the broken reference instead of silently ignoring it.
      if (!isDefined(targetObjectMetadata)) {
        continue;
      }

      augmentedObjectMetadataMaps = addFlatEntityToFlatEntityMapsOrThrow({
        flatEntity: targetObjectMetadata,
        flatEntityMaps: augmentedObjectMetadataMaps,
      });

      for (const targetFieldMetadata of getFlatFieldsFromFlatObjectMetadata(
        targetObjectMetadata,
        allFlatFieldMetadataMaps,
      )) {
        const alreadyIncludedField = findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: targetFieldMetadata.id,
          flatEntityMaps: augmentedFieldMetadataMaps,
        });

        if (isDefined(alreadyIncludedField)) {
          continue;
        }

        augmentedFieldMetadataMaps = addFlatEntityToFlatEntityMapsOrThrow({
          flatEntity: targetFieldMetadata,
          flatEntityMaps: augmentedFieldMetadataMaps,
        });
      }

      objectMetadataIdsToVisit.push(relationTargetObjectMetadataId);
    }
  }

  return {
    flatObjectMetadataMaps: augmentedObjectMetadataMaps,
    flatFieldMetadataMaps: augmentedFieldMetadataMaps,
  };
};
