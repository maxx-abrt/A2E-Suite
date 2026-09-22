import { GraphQLSchema } from 'graphql';
import { FieldMetadataType, RelationType } from 'twenty-shared/types';

import { ScalarsExplorerService } from 'src/engine/api/graphql/services/scalars-explorer.service';
import { WorkspaceGraphQLSchemaGenerator } from 'src/engine/api/graphql/workspace-schema-builder/workspace-graphql-schema.factory';
import { type SchemaGenerationContext } from 'src/engine/api/graphql/workspace-schema-builder/types/schema-generation-context.type';
import { WorkspaceGraphqlSchemaSDLService } from 'src/engine/api/graphql/workspace-graphql-schema-sdl/workspace-graphql-schema-sdl.service';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { WorkspaceCacheStorageService } from 'src/engine/workspace-cache-storage/workspace-cache-storage.service';

const STANDARD_APPLICATION_ID = 'standard-application-id';
const REQUESTED_APPLICATION_ID = 'requested-application-id';
const DOCUMENTS_APPLICATION_ID = 'documents-application-id';

const PROJECT_OBJECT_ID = 'project-object-id';
const DOCUMENT_OBJECT_ID = 'document-object-id';
const PROJECT_NAME_FIELD_ID = 'project-name-field-id';
const PROJECT_DOCUMENTS_FIELD_ID = 'project-documents-field-id';
const DOCUMENT_NAME_FIELD_ID = 'document-name-field-id';

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
    universalIdentifiersByApplicationId: entities.reduce(
      (acc, entity) => {
        const applicationId = entity.applicationId;

        if (!applicationId) {
          return acc;
        }

        acc[applicationId] = [
          ...(acc[applicationId] ?? []),
          entity.universalIdentifier,
        ];

        return acc;
      },
      {} as Record<string, string[]>,
    ),
  }) as unknown as FlatEntityMaps<T>;

const projectObjectMetadata = {
  id: PROJECT_OBJECT_ID,
  universalIdentifier: 'uid-project',
  nameSingular: 'project',
  namePlural: 'projects',
  fieldIds: [PROJECT_NAME_FIELD_ID, PROJECT_DOCUMENTS_FIELD_ID],
  applicationId: REQUESTED_APPLICATION_ID,
} as unknown as FlatObjectMetadata;

const documentObjectMetadata = {
  id: DOCUMENT_OBJECT_ID,
  universalIdentifier: 'uid-document',
  nameSingular: 'document',
  namePlural: 'documents',
  fieldIds: [DOCUMENT_NAME_FIELD_ID],
  applicationId: DOCUMENTS_APPLICATION_ID,
} as unknown as FlatObjectMetadata;

const projectNameField = {
  id: PROJECT_NAME_FIELD_ID,
  universalIdentifier: 'uid-project-name',
  objectMetadataId: PROJECT_OBJECT_ID,
  name: 'name',
  type: FieldMetadataType.TEXT,
  applicationId: REQUESTED_APPLICATION_ID,
} as unknown as FlatFieldMetadata;

const projectDocumentsField = {
  id: PROJECT_DOCUMENTS_FIELD_ID,
  universalIdentifier: 'uid-project-documents',
  objectMetadataId: PROJECT_OBJECT_ID,
  name: 'documents',
  type: FieldMetadataType.RELATION,
  relationTargetObjectMetadataId: DOCUMENT_OBJECT_ID,
  settings: { relationType: RelationType.MANY_TO_ONE },
  applicationId: REQUESTED_APPLICATION_ID,
} as unknown as FlatFieldMetadata;

const documentNameField = {
  id: DOCUMENT_NAME_FIELD_ID,
  universalIdentifier: 'uid-document-name',
  objectMetadataId: DOCUMENT_OBJECT_ID,
  name: 'name',
  type: FieldMetadataType.TEXT,
  applicationId: DOCUMENTS_APPLICATION_ID,
} as unknown as FlatFieldMetadata;

describe('WorkspaceGraphqlSchemaSDLService (application-scoped schema)', () => {
  const generateSchema = jest.fn(
    async (_context: SchemaGenerationContext): Promise<GraphQLSchema> =>
      new GraphQLSchema({}),
  );

  const buildService = () => {
    const service = new WorkspaceGraphqlSchemaSDLService(
      {
        getUsedScalarNames: () => [],
      } as unknown as ScalarsExplorerService,
      {
        generateSchema,
      } as unknown as WorkspaceGraphQLSchemaGenerator,
      {
        getGraphQLTypeDefs: async () => null,
        getGraphQLUsedScalarNames: async () => null,
        setGraphQLTypeDefs: async () => undefined,
        setGraphQLUsedScalarNames: async () => undefined,
      } as unknown as WorkspaceCacheStorageService,
      {
        getOrRecomputeManyOrAllFlatEntityMapsWithHashes: async () => ({
          data: {
            flatObjectMetadataMaps: buildFlatEntityMaps([
              projectObjectMetadata,
              documentObjectMetadata,
            ]),
            flatFieldMetadataMaps: buildFlatEntityMaps([
              projectNameField,
              projectDocumentsField,
              documentNameField,
            ]),
            flatIndexMaps: buildFlatEntityMaps([]),
            flatApplicationMaps: {
              idByUniversalIdentifier: {
                [TWENTY_STANDARD_APPLICATION.universalIdentifier]:
                  STANDARD_APPLICATION_ID,
              },
            },
          },
          hashes: {
            flatObjectMetadataMaps: 'hash-objects',
            flatFieldMetadataMaps: 'hash-fields',
            flatIndexMaps: 'hash-indexes',
            flatApplicationMaps: 'hash-applications',
          },
        }),
      } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService,
    );

    return service;
  };

  beforeEach(() => {
    generateSchema.mockClear();
  });

  it('includes the cross-application relation target object in the generation context', async () => {
    const service = buildService();

    await service.getOrComputeSchemaSDL(
      {
        id: 'workspace-id',
        databaseSchema: 'workspace_schema',
      } as unknown as FlatWorkspace,
      REQUESTED_APPLICATION_ID,
    );

    expect(generateSchema).toHaveBeenCalledTimes(1);

    const context = generateSchema.mock.calls[0][0];

    expect(
      context.flatObjectMetadataMaps.universalIdentifierById[
        DOCUMENT_OBJECT_ID
      ],
    ).toBeDefined();
    expect(
      context.flatObjectMetadataMaps.universalIdentifierById[PROJECT_OBJECT_ID],
    ).toBeDefined();
  });
});
