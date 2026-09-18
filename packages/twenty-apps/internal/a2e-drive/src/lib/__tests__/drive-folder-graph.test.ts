import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  ATTACHMENT_FIELD_IDS,
  FOLDER_FIELD_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../../constants/universal-identifiers.ts';

// Tier-0 manifest integrity for the P6.1 drive model. The install path
// flattens these declarations and rejects a relation whose target object or
// target field is not resolvable, so a green suite here is the cheapest proof
// that the folder self-relation and the attachment extensions form one closed
// graph. The live install stays a Tier-2 orchestrator check.

type RelationSettings = {
  relationType?: string;
  joinColumnName?: string;
  onDelete?: string;
};

type FieldDefinition = {
  universalIdentifier: string;
  objectUniversalIdentifier?: string;
  type: string;
  name: string;
  isNullable?: boolean;
  defaultValue?: string | boolean;
  relationTargetObjectMetadataUniversalIdentifier?: string;
  relationTargetFieldMetadataUniversalIdentifier?: string;
  universalSettings?: RelationSettings;
};

type ObjectDefinition = {
  universalIdentifier: string;
  nameSingular: string;
  labelIdentifierFieldMetadataUniversalIdentifier?: string;
  fields: FieldDefinition[];
};

type DefinitionResult<TDefinition> = {
  success: boolean;
  config: TDefinition;
};

const OBJECT_MODULE_PATHS = ['../../objects/drive-folder.object.ts'];

const FIELD_MODULE_PATHS = [
  '../../fields/attachment-folder.field.ts',
  '../../fields/attachment-starred.field.ts',
  '../../fields/attachment-source-app.field.ts',
  '../../fields/attachment-description.field.ts',
  '../../fields/attachment-archived-at.field.ts',
];

type OwnedField = {
  origin: string;
  owningObjectUniversalIdentifier: string;
  field: FieldDefinition;
};

type Graph = {
  objectIds: Set<string>;
  labelIdentifierByObject: Map<string, string | undefined>;
  fieldById: Map<string, OwnedField>;
  ownedFields: OwnedField[];
};

const unwrap = async <TDefinition>(modulePath: string): Promise<TDefinition> => {
  const module = (await import(modulePath)) as {
    default: DefinitionResult<TDefinition>;
  };

  assert.equal(module.default.success, true, `invalid definition: ${modulePath}`);

  return module.default.config;
};

const standardObjectIds = new Set(
  Object.values(
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS as Record<
      string,
      { universalIdentifier: string }
    >,
  ).map((object) => object.universalIdentifier),
);

const loadGraph = async (): Promise<Graph> => {
  const objectIds = new Set<string>();
  const labelIdentifierByObject = new Map<string, string | undefined>();
  const ownedFields: OwnedField[] = [];

  for (const path of OBJECT_MODULE_PATHS) {
    const definition = await unwrap<ObjectDefinition>(path);

    objectIds.add(definition.universalIdentifier);
    labelIdentifierByObject.set(
      definition.universalIdentifier,
      definition.labelIdentifierFieldMetadataUniversalIdentifier,
    );

    for (const field of definition.fields) {
      ownedFields.push({
        origin: `${definition.nameSingular}.${field.name}`,
        owningObjectUniversalIdentifier: definition.universalIdentifier,
        field,
      });
    }
  }

  for (const path of FIELD_MODULE_PATHS) {
    const field = await unwrap<FieldDefinition>(path);

    ownedFields.push({
      origin: path,
      owningObjectUniversalIdentifier: field.objectUniversalIdentifier ?? '',
      field,
    });
  }

  const fieldById = new Map<string, OwnedField>();

  for (const ownedField of ownedFields) {
    fieldById.set(ownedField.field.universalIdentifier, ownedField);
  }

  return { objectIds, labelIdentifierByObject, fieldById, ownedFields };
};

const findFieldById = (graph: Graph, universalIdentifier: string): FieldDefinition => {
  const match = graph.fieldById.get(universalIdentifier);

  assert.ok(match, `field ${universalIdentifier} not declared`);

  return match.field;
};

test('no universal identifier is declared twice across objects and fields', async () => {
  const graph = await loadGraph();
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  const register = (identifier: string, origin: string) => {
    if (identifier.length === 0) {
      return;
    }

    if (seen.has(identifier)) {
      duplicates.push(`${identifier} in ${seen.get(identifier)} and ${origin}`);
      return;
    }

    seen.set(identifier, origin);
  };

  for (const identifier of graph.objectIds) {
    register(identifier, 'object');
  }

  for (const { origin, field } of graph.ownedFields) {
    register(field.universalIdentifier, origin);
  }

  assert.deepEqual(duplicates, []);
});

test('driveFolder is the only app object and keeps its label identifier', async () => {
  const graph = await loadGraph();

  assert.deepEqual([...graph.objectIds], [OBJECT_IDS.driveFolder]);
  assert.equal(
    graph.labelIdentifierByObject.get(OBJECT_IDS.driveFolder),
    FOLDER_FIELD_IDS.name,
  );
  assert.ok(graph.fieldById.has(FOLDER_FIELD_IDS.name));
});

test('the attachment extensions live on the standard attachment object', async () => {
  const graph = await loadGraph();
  const attachmentId =
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier;

  for (const fieldId of [
    ATTACHMENT_FIELD_IDS.folder,
    ATTACHMENT_FIELD_IDS.starred,
    ATTACHMENT_FIELD_IDS.sourceApp,
    ATTACHMENT_FIELD_IDS.description,
  ]) {
    assert.equal(
      graph.fieldById.get(fieldId)?.owningObjectUniversalIdentifier,
      attachmentId,
      `${fieldId} must be owned by the standard attachment object`,
    );
  }
});

test('every relation target object and target field resolves', async () => {
  const graph = await loadGraph();
  const resolvableObjectIds = new Set([...graph.objectIds, ...standardObjectIds]);
  const unresolved: string[] = [];

  for (const { origin, field } of graph.ownedFields) {
    if (field.type !== 'RELATION') {
      continue;
    }

    if (
      field.relationTargetObjectMetadataUniversalIdentifier === undefined ||
      !resolvableObjectIds.has(field.relationTargetObjectMetadataUniversalIdentifier)
    ) {
      unresolved.push(
        `${origin} -> object ${field.relationTargetObjectMetadataUniversalIdentifier ?? 'missing'}`,
      );
    }

    if (
      field.relationTargetFieldMetadataUniversalIdentifier === undefined ||
      !graph.fieldById.has(field.relationTargetFieldMetadataUniversalIdentifier)
    ) {
      unresolved.push(
        `${origin} -> field ${field.relationTargetFieldMetadataUniversalIdentifier ?? 'missing'}`,
      );
    }
  }

  assert.deepEqual(unresolved, []);
});

test('every relation is a symmetric M2O/O2M pair owned by its target object', async () => {
  const graph = await loadGraph();
  const mismatches: string[] = [];

  for (const { origin, owningObjectUniversalIdentifier, field } of graph.ownedFields) {
    if (field.type !== 'RELATION') {
      continue;
    }

    const targetFieldId = field.relationTargetFieldMetadataUniversalIdentifier;
    const targetOwnedField =
      targetFieldId === undefined ? undefined : graph.fieldById.get(targetFieldId);

    if (targetOwnedField === undefined) {
      mismatches.push(`${origin}: target field ${targetFieldId ?? 'missing'} not declared`);
      continue;
    }

    if (
      targetOwnedField.owningObjectUniversalIdentifier !==
      field.relationTargetObjectMetadataUniversalIdentifier
    ) {
      mismatches.push(
        `${origin}: inverse ${targetOwnedField.origin} lives on ` +
          `${targetOwnedField.owningObjectUniversalIdentifier}, not on the relation target`,
      );
    }

    if (
      targetOwnedField.field.relationTargetObjectMetadataUniversalIdentifier !==
      owningObjectUniversalIdentifier
    ) {
      mismatches.push(
        `${origin}: inverse ${targetOwnedField.origin} does not point back to ` +
          `${owningObjectUniversalIdentifier}`,
      );
    }

    const relationTypes = [
      field.universalSettings?.relationType,
      targetOwnedField.field.universalSettings?.relationType,
    ];
    const complementary =
      relationTypes.includes('MANY_TO_ONE') && relationTypes.includes('ONE_TO_MANY');

    if (!complementary) {
      mismatches.push(`${origin}: ${relationTypes.join('/')} is not a MANY_TO_ONE/ONE_TO_MANY pair`);
    }
  }

  assert.deepEqual(mismatches, []);
});

test('folder.parent is a CASCADE self-relation closing on folder.children', async () => {
  const graph = await loadGraph();
  const parent = findFieldById(graph, RELATION_IDS.folderParent);
  const children = findFieldById(graph, RELATION_IDS.folderChildren);

  assert.equal(parent.type, 'RELATION');
  assert.equal(parent.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(parent.universalSettings?.joinColumnName, 'parentFolderId');
  assert.equal(parent.universalSettings?.onDelete, 'CASCADE');
  assert.equal(parent.relationTargetObjectMetadataUniversalIdentifier, OBJECT_IDS.driveFolder);
  assert.equal(parent.relationTargetFieldMetadataUniversalIdentifier, RELATION_IDS.folderChildren);

  assert.equal(children.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(children.relationTargetObjectMetadataUniversalIdentifier, OBJECT_IDS.driveFolder);
  assert.equal(children.relationTargetFieldMetadataUniversalIdentifier, RELATION_IDS.folderParent);
  assert.equal(
    graph.fieldById.get(RELATION_IDS.folderChildren)?.owningObjectUniversalIdentifier,
    OBJECT_IDS.driveFolder,
  );
});

test('attachment.folder closes on driveFolder.files with a folderId SET_NULL FK', async () => {
  const graph = await loadGraph();
  const folder = findFieldById(graph, ATTACHMENT_FIELD_IDS.folder);
  const files = findFieldById(graph, ATTACHMENT_FIELD_IDS.driveFolderFiles);

  assert.equal(folder.type, 'RELATION');
  assert.equal(folder.name, 'folder');
  assert.equal(folder.isNullable, true);
  assert.equal(folder.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(folder.universalSettings?.joinColumnName, 'folderId');
  assert.equal(folder.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(folder.relationTargetObjectMetadataUniversalIdentifier, OBJECT_IDS.driveFolder);
  assert.equal(folder.relationTargetFieldMetadataUniversalIdentifier, ATTACHMENT_FIELD_IDS.driveFolderFiles);

  assert.equal(files.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(
    files.relationTargetObjectMetadataUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  );
  assert.equal(files.relationTargetFieldMetadataUniversalIdentifier, ATTACHMENT_FIELD_IDS.folder);
  assert.equal(
    graph.fieldById.get(ATTACHMENT_FIELD_IDS.driveFolderFiles)
      ?.owningObjectUniversalIdentifier,
    OBJECT_IDS.driveFolder,
  );
});

test('starred, sourceApp and description are additive presentation fields', async () => {
  const graph = await loadGraph();
  const starred = findFieldById(graph, ATTACHMENT_FIELD_IDS.starred);
  const sourceApp = findFieldById(graph, ATTACHMENT_FIELD_IDS.sourceApp);
  const description = findFieldById(graph, ATTACHMENT_FIELD_IDS.description);

  assert.equal(starred.type, 'BOOLEAN');
  assert.equal(starred.name, 'starred');
  assert.equal(starred.defaultValue, false);

  assert.equal(sourceApp.type, 'TEXT');
  assert.equal(sourceApp.name, 'sourceApp');
  assert.equal(sourceApp.isNullable, true);

  assert.equal(description.type, 'TEXT');
  assert.equal(description.name, 'description');
  assert.equal(description.isNullable, true);
});

test('archivedAt is the shared 7-day corbeille marker on folders and files', async () => {
  const graph = await loadGraph();
  const folderArchivedAt = findFieldById(graph, FOLDER_FIELD_IDS.archivedAt);
  const fileArchivedAt = findFieldById(graph, ATTACHMENT_FIELD_IDS.archivedAt);

  for (const field of [folderArchivedAt, fileArchivedAt]) {
    assert.equal(field.type, 'DATE_TIME');
    assert.equal(field.name, 'archivedAt');
    assert.equal(field.isNullable, true);
  }

  assert.equal(
    graph.fieldById.get(FOLDER_FIELD_IDS.archivedAt)
      ?.owningObjectUniversalIdentifier,
    OBJECT_IDS.driveFolder,
  );
});
