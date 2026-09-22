import { GraphQLObjectType } from 'graphql';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import { ArgsTypeGenerator } from 'src/engine/api/graphql/workspace-schema-builder/graphql-type-generators/args-type/args-type.generator';
import { ObjectMetadataWithRelationsGqlObjectTypeGenerator } from 'src/engine/api/graphql/workspace-schema-builder/graphql-type-generators/object-types/object-metadata-with-relations-gql-object-type.generator';
import { ObjectTypeDefinitionKind } from 'src/engine/api/graphql/workspace-schema-builder/enums/object-type-definition-kind.enum';
import { GqlTypesStorage } from 'src/engine/api/graphql/workspace-schema-builder/storages/gql-types.storage';
import { computeObjectMetadataObjectTypeKey } from 'src/engine/api/graphql/workspace-schema-builder/utils/compute-stored-gql-type-key-utils/compute-object-metadata-object-type-key.util';
import { type SchemaGenerationContext } from 'src/engine/api/graphql/workspace-schema-builder/types/schema-generation-context.type';
import { augmentFlatEntityMapsWithRelationTargets } from 'src/engine/api/graphql/workspace-graphql-schema-sdl/utils/augment-flat-entity-maps-with-relation-targets.util';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';

const PROJECT_OBJECT_ID = 'project-object-id';
const DOCUMENT_OBJECT_ID = 'document-object-id';
const PROJECT_NAME_FIELD_ID = 'project-name-field-id';
const PROJECT_DOCUMENTS_FIELD_ID = 'project-documents-field-id';
const DOCUMENT_NAME_FIELD_ID = 'document-name-field-id';

const buildObjectMetadata = ({
  id,
  nameSingular,
  fieldIds,
}: {
  id: string;
  nameSingular: string;
  fieldIds: string[];
}): FlatObjectMetadata =>
  ({
    id,
    universalIdentifier: `uid-${id}`,
    nameSingular,
    namePlural: `${nameSingular}s`,
    fieldIds,
    applicationId: `app-${id}`,
  }) as unknown as FlatObjectMetadata;

const buildNameField = ({
  id,
  objectMetadataId,
}: {
  id: string;
  objectMetadataId: string;
}): FlatFieldMetadata =>
  ({
    id,
    universalIdentifier: `uid-${id}`,
    objectMetadataId,
    name: 'name',
    type: FieldMetadataType.TEXT,
    isNullable: true,
  }) as unknown as FlatFieldMetadata;

const buildRelationField = ({
  id,
  objectMetadataId,
  name,
  relationTargetObjectMetadataId,
  relationType,
}: {
  id: string;
  objectMetadataId: string;
  name: string;
  relationTargetObjectMetadataId: string;
  relationType: RelationType;
}): FlatFieldMetadata =>
  ({
    id,
    universalIdentifier: `uid-${id}`,
    objectMetadataId,
    name,
    type: FieldMetadataType.RELATION,
    isNullable: true,
    relationTargetObjectMetadataId,
    settings: { relationType },
  }) as unknown as FlatFieldMetadata;

const buildFlatEntityMaps = <T extends SyncableFlatEntity>(
  entities: T[],
): FlatEntityMaps<T> =>
  ({
    byUniversalIdentifier: entities.reduce(
      (acc, entity) => {
        acc[entity.universalIdentifier] = entity;

        return acc;
      },
      {} as Record<string, T>,
    ),
    universalIdentifierById: entities.reduce(
      (acc, entity) => {
        acc[entity.id] = entity.universalIdentifier;

        return acc;
      },
      {} as Record<string, string>,
    ),
    universalIdentifiersByApplicationId: {},
  }) as unknown as FlatEntityMaps<T>;

const emptyFlatEntityMaps = buildFlatEntityMaps([]);

const projectObjectMetadata = buildObjectMetadata({
  id: PROJECT_OBJECT_ID,
  nameSingular: 'project',
  fieldIds: [PROJECT_NAME_FIELD_ID, PROJECT_DOCUMENTS_FIELD_ID],
});

const documentObjectMetadata = buildObjectMetadata({
  id: DOCUMENT_OBJECT_ID,
  nameSingular: 'document',
  fieldIds: [DOCUMENT_NAME_FIELD_ID],
});

const projectNameField = buildNameField({
  id: PROJECT_NAME_FIELD_ID,
  objectMetadataId: PROJECT_OBJECT_ID,
});

const documentNameField = buildNameField({
  id: DOCUMENT_NAME_FIELD_ID,
  objectMetadataId: DOCUMENT_OBJECT_ID,
});

const projectDocumentsField = buildRelationField({
  id: PROJECT_DOCUMENTS_FIELD_ID,
  objectMetadataId: PROJECT_OBJECT_ID,
  name: 'documents',
  relationTargetObjectMetadataId: DOCUMENT_OBJECT_ID,
  relationType: RelationType.MANY_TO_ONE,
});

// The application-scoped maps hold the requesting application's objects and
// fields only; the cross-app relation target (`document`) is filtered out.
const scopedObjectMetadataMaps = buildFlatEntityMaps([projectObjectMetadata]);
const scopedFieldMetadataMaps = buildFlatEntityMaps([
  projectNameField,
  projectDocumentsField,
]);

const allObjectMetadataMaps = buildFlatEntityMaps([
  projectObjectMetadata,
  documentObjectMetadata,
]);
const allFieldMetadataMaps = buildFlatEntityMaps([
  projectNameField,
  projectDocumentsField,
  documentNameField,
]);

describe('augmentFlatEntityMapsWithRelationTargets', () => {
  it('adds a relation target object owned by another application, with its fields', () => {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      augmentFlatEntityMapsWithRelationTargets({
        flatObjectMetadataMaps: scopedObjectMetadataMaps,
        flatFieldMetadataMaps: scopedFieldMetadataMaps,
        allFlatObjectMetadataMaps: allObjectMetadataMaps,
        allFlatFieldMetadataMaps: allFieldMetadataMaps,
      });

    expect(
      flatObjectMetadataMaps.universalIdentifierById[DOCUMENT_OBJECT_ID],
    ).toBeDefined();
    expect(
      flatFieldMetadataMaps.universalIdentifierById[DOCUMENT_NAME_FIELD_ID],
    ).toBeDefined();
  });

  it('leaves maps untouched when every relation target is already present', () => {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      augmentFlatEntityMapsWithRelationTargets({
        flatObjectMetadataMaps: allObjectMetadataMaps,
        flatFieldMetadataMaps: allFieldMetadataMaps,
        allFlatObjectMetadataMaps: allObjectMetadataMaps,
        allFlatFieldMetadataMaps: allFieldMetadataMaps,
      });

    expect(
      Object.keys(flatObjectMetadataMaps.byUniversalIdentifier),
    ).toHaveLength(2);
    expect(
      Object.keys(flatFieldMetadataMaps.byUniversalIdentifier),
    ).toHaveLength(3);
  });

  it('does not invent a target that is absent from the full maps', () => {
    const orphanRelationField = buildRelationField({
      id: 'orphan-relation-field-id',
      objectMetadataId: PROJECT_OBJECT_ID,
      name: 'orphan',
      relationTargetObjectMetadataId: 'missing-object-id',
      relationType: RelationType.MANY_TO_ONE,
    });

    const { flatObjectMetadataMaps } = augmentFlatEntityMapsWithRelationTargets(
      {
        flatObjectMetadataMaps: scopedObjectMetadataMaps,
        flatFieldMetadataMaps: buildFlatEntityMaps([
          projectNameField,
          orphanRelationField,
        ]),
        allFlatObjectMetadataMaps: allObjectMetadataMaps,
        allFlatFieldMetadataMaps: allFieldMetadataMaps,
      },
    );

    expect(
      Object.keys(flatObjectMetadataMaps.byUniversalIdentifier),
    ).toHaveLength(1);
  });

  it('lets the relation object type generator build the cross-app relation instead of throwing', () => {
    const buildGeneratorAndStorage = () => {
      const gqlTypesStorage = new GqlTypesStorage();

      for (const nameSingular of ['project', 'document']) {
        gqlTypesStorage.addGqlType(
          computeObjectMetadataObjectTypeKey(
            nameSingular,
            ObjectTypeDefinitionKind.Plain,
          ),
          new GraphQLObjectType({ name: nameSingular, fields: {} }),
        );
      }

      return {
        gqlTypesStorage,
        generator: new ObjectMetadataWithRelationsGqlObjectTypeGenerator(
          new ArgsTypeGenerator(gqlTypesStorage),
          gqlTypesStorage,
        ),
      };
    };

    const scopedContext: SchemaGenerationContext = {
      flatObjectMetadataMaps: scopedObjectMetadataMaps,
      flatFieldMetadataMaps: scopedFieldMetadataMaps,
      flatIndexMaps: emptyFlatEntityMaps,
    };

    const {
      generator: scopedGenerator,
      gqlTypesStorage: scopedGqlTypesStorage,
    } = buildGeneratorAndStorage();

    // The generator stores its fields as a lazy thunk, so the reported guard
    // fires when the object type's fields are materialized.
    expect(() => {
      scopedGenerator.buildAndStore(
        projectObjectMetadata,
        [projectNameField, projectDocumentsField],
        scopedContext,
      );

      const storedType = scopedGqlTypesStorage.getGqlTypeByKey(
        computeObjectMetadataObjectTypeKey(
          'project',
          ObjectTypeDefinitionKind.Plain,
        ),
      ) as GraphQLObjectType;

      storedType.getFields();
    }).toThrow('has no relation target object metadata');

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      augmentFlatEntityMapsWithRelationTargets({
        flatObjectMetadataMaps: scopedObjectMetadataMaps,
        flatFieldMetadataMaps: scopedFieldMetadataMaps,
        allFlatObjectMetadataMaps: allObjectMetadataMaps,
        allFlatFieldMetadataMaps: allFieldMetadataMaps,
      });

    const augmentedContext: SchemaGenerationContext = {
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatIndexMaps: emptyFlatEntityMaps,
    };

    const {
      generator: augmentedGenerator,
      gqlTypesStorage: augmentedGqlTypesStorage,
    } = buildGeneratorAndStorage();

    expect(() => {
      augmentedGenerator.buildAndStore(
        projectObjectMetadata,
        [projectNameField, projectDocumentsField],
        augmentedContext,
      );

      const storedType = augmentedGqlTypesStorage.getGqlTypeByKey(
        computeObjectMetadataObjectTypeKey(
          'project',
          ObjectTypeDefinitionKind.Plain,
        ),
      ) as GraphQLObjectType;

      storedType.getFields();
    }).not.toThrow();
  });
});
