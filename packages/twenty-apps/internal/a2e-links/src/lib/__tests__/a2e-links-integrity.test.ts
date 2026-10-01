import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_IDS,
  MORPH_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../../constants/universal-identifiers.ts';

// Whole-manifest graph walk for the M11a link junction (the P4.1/P5.1
// object-integrity walk, trimmed to links). The install path flattens every
// declaration into metadata and rejects a morph/relation whose target object
// or inverse field does not resolve, or whose morph group targets the source
// object or duplicates a target. A green suite here is the cheapest proof that
// the installed a2eLink object plus its inverse fields resolve; the live app
// install stays Tier 2.

type FieldDefinition = {
  universalIdentifier: string;
  objectUniversalIdentifier?: string;
  type: string;
  name: string;
  morphId?: string;
  relationTargetObjectMetadataUniversalIdentifier?: string;
  relationTargetFieldMetadataUniversalIdentifier?: string;
  universalSettings?: { relationType?: string; onDelete?: string };
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
  errors?: unknown[];
};

const OBJECT_MODULE_PATHS = ['../../objects/a2e-link.object.ts'];

const FIELD_MODULE_PATHS = [
  '../../fields/source-document.field.ts',
  '../../fields/source-task.field.ts',
  '../../fields/target-document.field.ts',
  '../../fields/target-task.field.ts',
  '../../fields/document-outgoing-links.field.ts',
  '../../fields/document-incoming-links.field.ts',
  '../../fields/task-outgoing-links.field.ts',
  '../../fields/task-incoming-links.field.ts',
];

const unwrap = async <TDefinition>(
  modulePath: string,
): Promise<TDefinition> => {
  const module = (await import(modulePath)) as {
    default: DefinitionResult<TDefinition>;
  };

  assert.equal(
    module.default.success,
    true,
    `invalid definition: ${modulePath}`,
  );

  return module.default.config;
};

type OwnedField = {
  origin: string;
  owningObjectUniversalIdentifier: string;
  field: FieldDefinition;
};

const isRelationLike = (field: FieldDefinition): boolean =>
  field.type === 'RELATION' || field.type === 'MORPH_RELATION';

const standardObjectIds = new Set(
  Object.values(
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS as unknown as Record<
      string,
      { universalIdentifier: string; fields?: Record<string, unknown> }
    >,
  ).map((object) => object.universalIdentifier),
);

const loadGraph = async () => {
  const objects: ObjectDefinition[] = [];
  const objectIds = new Set<string>();
  const ownedFields: OwnedField[] = [];

  for (const path of OBJECT_MODULE_PATHS) {
    const definition = await unwrap<ObjectDefinition>(path);

    objects.push(definition);
    objectIds.add(definition.universalIdentifier);

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

  return {
    objects,
    objectIds,
    ownedFields,
    fieldById,
    // `document` belongs to A2E Documents, installed before links; its
    // universal identifier is a known cross-app target at install time.
    resolvableObjectIds: new Set([
      ...objectIds,
      ...standardObjectIds,
      ...Object.values(EXTERNAL_OBJECT_IDS),
    ]),
  };
};

test('the app declares exactly the a2eLink junction object', async () => {
  const graph = await loadGraph();

  assert.equal(graph.objects.length, 1);
  assert.equal(graph.objects[0].nameSingular, 'a2eLink');
  assert.equal(graph.objects[0].universalIdentifier, OBJECT_IDS.a2eLink);
});

test('no universal identifier is declared twice across the whole app manifest', async () => {
  const graph = await loadGraph();
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  for (const object of graph.objects) {
    if (seen.has(object.universalIdentifier)) {
      duplicates.push(object.universalIdentifier);
    }

    seen.set(object.universalIdentifier, `object:${object.nameSingular}`);
  }

  for (const { origin, field } of graph.ownedFields) {
    if (seen.has(field.universalIdentifier)) {
      duplicates.push(
        `${field.universalIdentifier} in ${seen.get(field.universalIdentifier)} and ${origin}`,
      );
    }

    seen.set(field.universalIdentifier, origin);
  }

  assert.deepEqual(duplicates, []);
});

test('every relation target object and target field resolves', async () => {
  const graph = await loadGraph();
  const unresolved: string[] = [];

  for (const { origin, field } of graph.ownedFields) {
    if (!isRelationLike(field)) {
      continue;
    }

    if (
      field.relationTargetObjectMetadataUniversalIdentifier === undefined ||
      !graph.resolvableObjectIds.has(
        field.relationTargetObjectMetadataUniversalIdentifier,
      )
    ) {
      unresolved.push(
        `${origin} -> object ${field.relationTargetObjectMetadataUniversalIdentifier ?? 'missing'}`,
      );
    }

    if (
      field.relationTargetFieldMetadataUniversalIdentifier === undefined ||
      !graph.fieldById.has(
        field.relationTargetFieldMetadataUniversalIdentifier,
      )
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

  for (const {
    origin,
    owningObjectUniversalIdentifier,
    field,
  } of graph.ownedFields) {
    if (!isRelationLike(field)) {
      continue;
    }

    const targetFieldId = field.relationTargetFieldMetadataUniversalIdentifier;
    const targetOwnedField =
      targetFieldId === undefined ? undefined : graph.fieldById.get(targetFieldId);

    if (targetOwnedField === undefined) {
      mismatches.push(
        `${origin}: target field ${targetFieldId ?? 'missing'} not declared`,
      );
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
      relationTypes.includes('MANY_TO_ONE') &&
      relationTypes.includes('ONE_TO_MANY');

    if (!complementary) {
      mismatches.push(
        `${origin}: ${relationTypes.join('/')} is not a MANY_TO_ONE/ONE_TO_MANY pair`,
      );
    }
  }

  assert.deepEqual(mismatches, []);
});

test('every morph group is well formed and never targets the junction', async () => {
  const graph = await loadGraph();
  const problems: string[] = [];

  for (const { origin, owningObjectUniversalIdentifier, field } of graph
    .ownedFields) {
    if (field.type !== 'MORPH_RELATION') {
      continue;
    }

    if (field.morphId === undefined || field.morphId.length === 0) {
      problems.push(`${origin}: morph leg without morphId`);
      continue;
    }

    if (
      field.relationTargetObjectMetadataUniversalIdentifier ===
      owningObjectUniversalIdentifier
    ) {
      problems.push(`${origin}: morph leg targets its own object`);
    }

    const group = graph.ownedFields.filter(
      (candidate) => candidate.field.morphId === field.morphId,
    );

    const targetObjects = group.map(
      (candidate) =>
        candidate.field.relationTargetObjectMetadataUniversalIdentifier,
    );

    if (new Set(targetObjects).size !== targetObjects.length) {
      problems.push(`${origin}: morph group ${field.morphId} targets an object twice`);
    }

    if (
      group.some(
        (candidate) =>
          candidate.field.universalSettings?.relationType !== 'MANY_TO_ONE',
      )
    ) {
      problems.push(`${origin}: morph group ${field.morphId} is not all MANY_TO_ONE`);
    }
  }

  assert.deepEqual(problems, []);
});

test('the source and target morph groups are distinct and cover document and task', async () => {
  const graph = await loadGraph();
  const morphFields = graph.ownedFields.filter(
    ({ field }) => field.type === 'MORPH_RELATION',
  );

  const sourceFields = morphFields.filter(
    ({ field }) => field.morphId === MORPH_IDS.source,
  );
  const targetFields = morphFields.filter(
    ({ field }) => field.morphId === MORPH_IDS.target,
  );

  assert.notEqual(MORPH_IDS.source, MORPH_IDS.target);
  assert.equal(sourceFields.length, 2);
  assert.equal(targetFields.length, 2);
  assert.deepEqual(
    sourceFields.map(({ field }) => field.name).sort(),
    ['sourceDocument', 'sourceTask'],
  );
  assert.deepEqual(
    targetFields.map(({ field }) => field.name).sort(),
    ['targetDocument', 'targetTask'],
  );
});

test('every declared relation identifier is used by exactly one relation side', async () => {
  const graph = await loadGraph();
  const relationFields = graph.ownedFields.filter(({ field }) =>
    isRelationLike(field),
  );

  for (const identifier of Object.values(RELATION_IDS)) {
    assert.ok(
      graph.fieldById.has(identifier),
      `RELATION_IDS entry ${identifier} is not a declared relation field`,
    );
  }

  const identifiers = relationFields.map(
    ({ field }) => field.universalIdentifier,
  );
  const duplicates = identifiers.filter(
    (identifier, index) => identifiers.indexOf(identifier) !== index,
  );

  assert.deepEqual(duplicates, []);
});
