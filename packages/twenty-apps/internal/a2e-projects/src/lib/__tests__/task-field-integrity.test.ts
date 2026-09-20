import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS, TASK_FIELD_IDS, EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS } from '../../constants/universal-identifiers.ts';

// Tier-0 API/manifest integrity for the P4.1 task app fields. The app install
// path flattens these declarations into field metadata and rejects a relation
// whose target object or target field is not resolvable ("Relation field
// target metadata not found"), so a green suite here is the cheapest proof
// that the eight task app fields and their inverses form one closed graph.
// The live create/read/update lifecycle stays a Tier-2 orchestrator check.

type SelectOption = {
  id?: string;
  universalIdentifier?: string;
  value: string;
  position: number;
};

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
  defaultValue?: string;
  options?: SelectOption[];
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
  errors?: unknown[];
};

const OBJECT_MODULE_PATHS = [
  '../../objects/project.object.ts',
  '../../objects/milestone.object.ts',
  '../../objects/project-member.object.ts',
  '../../objects/time-entry.object.ts',
  '../../objects/label.object.ts',
  '../../objects/task-label.object.ts',
];

const FIELD_MODULE_PATHS = [
  '../../fields/note-blocked-tasks.field.ts',
  '../../fields/project-tasks.field.ts',
  '../../fields/task-block-issue.field.ts',
  '../../fields/task-blocked-by.field.ts',
  '../../fields/task-blocks.field.ts',
  '../../fields/task-estimate.field.ts',
  '../../fields/task-estimate-label.field.ts',
  '../../fields/task-human-id.field.ts',
  '../../fields/task-labels.field.ts',
  '../../fields/task-milestone.field.ts',
  '../../fields/task-priority.field.ts',
  '../../fields/task-project.field.ts',
  '../../fields/task-project-status.field.ts',
  '../../fields/task-retroplanning-provenance.field.ts',
  '../../fields/task-subtask.field.ts',
  '../../fields/task-subtasks.field.ts',
  '../../fields/task-time-entries.field.ts',
  '../../fields/lead-projects.field.ts',
  '../../fields/company-projects.field.ts',
  '../../fields/project-milestones.field.ts',
  '../../fields/milestone-tasks.field.ts',
  '../../fields/project-members.field.ts',
  '../../fields/workspace-member-project-memberships.field.ts',
  '../../fields/project-time-entries.field.ts',
  '../../fields/workspace-member-time-entries.field.ts',
  '../../fields/document-project.field.ts',
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

const readOptionId = (option: SelectOption): string =>
  option.id ?? option.universalIdentifier ?? '';

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

    // A standalone field's owning object is its objectUniversalIdentifier;
    // embedded fields inherit the parent object.
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

test('no universal identifier is declared twice across objects, fields and options', async () => {
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

    for (const option of field.options ?? []) {
      register(readOptionId(option), `${origin}:option`);
    }
  }

  assert.deepEqual(duplicates, []);
});

test('the six app objects exist once and keep their junction, milestone and time-entry objects', async () => {
  const graph = await loadGraph();

  assert.deepEqual(
    [...graph.objectIds].sort(),
    [
      OBJECT_IDS.project,
      OBJECT_IDS.milestone,
      OBJECT_IDS.projectMember,
      OBJECT_IDS.timeEntry,
      OBJECT_IDS.label,
      OBJECT_IDS.taskLabel,
    ].sort(),
  );
  assert.equal(graph.objectIds.size, 6);
});

test('every relation target object and target field resolves', async () => {
  const graph = await loadGraph();
  const resolvableObjectIds = new Set([
    ...graph.objectIds,
    ...standardObjectIds,
    ...Object.values(EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS),
  ]);
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
        `${origin}: inverse ${targetOwnedField.origin} points back to ` +
          `${targetOwnedField.field.relationTargetObjectMetadataUniversalIdentifier ?? 'nothing'}, ` +
          `not ${owningObjectUniversalIdentifier}`,
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

test('every object label identifier resolves to a declared field', async () => {
  const graph = await loadGraph();
  const missing: string[] = [];

  for (const [objectId, labelIdentifier] of graph.labelIdentifierByObject) {
    if (labelIdentifier !== undefined && !graph.fieldById.has(labelIdentifier)) {
      missing.push(`${objectId} -> ${labelIdentifier}`);
    }
  }

  assert.deepEqual(missing, []);
});

test('task.project and its inverse close the project relation with SET_NULL', async () => {
  const graph = await loadGraph();
  const project = findFieldById(graph, TASK_FIELD_IDS.project);
  const tasksOnProject = findFieldById(graph, TASK_FIELD_IDS.tasksOnProject);

  assert.equal(project.type, 'RELATION');
  assert.equal(project.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(project.universalSettings?.joinColumnName, 'projectId');
  assert.equal(project.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(project.relationTargetObjectMetadataUniversalIdentifier, OBJECT_IDS.project);
  assert.equal(project.relationTargetFieldMetadataUniversalIdentifier, TASK_FIELD_IDS.tasksOnProject);

  assert.equal(tasksOnProject.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(tasksOnProject.relationTargetFieldMetadataUniversalIdentifier, TASK_FIELD_IDS.project);
  assert.equal(
    graph.fieldById.get(TASK_FIELD_IDS.tasksOnProject)?.owningObjectUniversalIdentifier,
    OBJECT_IDS.project,
  );
});

test('projectStatus stays a SELECT pipeline (no custom-status object)', async () => {
  const graph = await loadGraph();
  const projectStatus = findFieldById(graph, TASK_FIELD_IDS.projectStatus);

  assert.equal(projectStatus.type, 'SELECT');
  assert.equal(projectStatus.defaultValue, "'TODO'");
  assert.deepEqual(
    projectStatus.options?.map((option) => option.value),
    ['TODO', 'IN_PROGRESS', 'DONE'],
  );
  assert.equal(new Set(projectStatus.options?.map(readOptionId)).size, 3);

  // The P4.1 note says keep the select approach unless a requirement needs
  // more: no status object was added to the six app objects.
  assert.equal(graph.objectIds.size, 6);
});

test('priority and the t-shirt estimate keep their option sets', async () => {
  const graph = await loadGraph();
  const priority = findFieldById(graph, TASK_FIELD_IDS.priority);
  const estimate = findFieldById(graph, TASK_FIELD_IDS.estimate);
  const estimateLabel = findFieldById(graph, TASK_FIELD_IDS.estimateLabel);

  assert.equal(priority.type, 'SELECT');
  assert.deepEqual(
    priority.options?.map((option) => option.value),
    ['URGENT', 'HIGH', 'MEDIUM', 'LOW'],
  );

  assert.equal(estimate.type, 'TEXT');
  assert.equal(estimateLabel.type, 'TEXT');
  assert.deepEqual(
    estimateLabel.options?.map((option) => option.value),
    ['XS', 'S', 'M', 'L', 'XL'],
  );
  assert.equal(new Set(estimateLabel.options?.map(readOptionId)).size, 5);
});

test('the labels many-to-many is a task/taskLabel junction with CASCADE both ways', async () => {
  const graph = await loadGraph();
  const taskLabels = findFieldById(graph, TASK_FIELD_IDS.taskLabels);
  const labelsOnTask = findFieldById(graph, RELATION_IDS.labelsOnTask);
  const taskLabelLabel = findFieldById(graph, RELATION_IDS.taskLabelLabel);
  const labelTaskLabels = findFieldById(graph, RELATION_IDS.labelTaskLabels);

  assert.equal(taskLabels.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(labelsOnTask.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(labelsOnTask.universalSettings?.onDelete, 'CASCADE');
  assert.equal(
    labelsOnTask.relationTargetFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.taskLabels,
  );

  assert.equal(taskLabelLabel.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(taskLabelLabel.universalSettings?.onDelete, 'CASCADE');
  assert.equal(
    taskLabelLabel.relationTargetFieldMetadataUniversalIdentifier,
    RELATION_IDS.labelTaskLabels,
  );
  assert.equal(labelTaskLabels.universalSettings?.relationType, 'ONE_TO_MANY');
});

test('the subtask parent is a SET_NULL task self-relation with a declared inverse', async () => {
  const graph = await loadGraph();
  const parentTask = findFieldById(graph, TASK_FIELD_IDS.parentTask);
  const subtasks = findFieldById(graph, RELATION_IDS.subtasks);

  assert.equal(parentTask.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(parentTask.universalSettings?.joinColumnName, 'subtaskId');
  assert.equal(parentTask.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(
    parentTask.relationTargetObjectMetadataUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
  assert.equal(parentTask.relationTargetFieldMetadataUniversalIdentifier, RELATION_IDS.subtasks);
  assert.equal(subtasks.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(subtasks.relationTargetFieldMetadataUniversalIdentifier, TASK_FIELD_IDS.parentTask);
});

test('the blockedBy relation targets the standard note object with a declared inverse', async () => {
  const graph = await loadGraph();
  const blockIssue = findFieldById(graph, TASK_FIELD_IDS.blockIssue);
  const blockedTasks = findFieldById(graph, TASK_FIELD_IDS.blockedTasks);

  assert.equal(blockIssue.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(blockIssue.universalSettings?.joinColumnName, 'blockIssueId');
  assert.equal(blockIssue.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(
    blockIssue.relationTargetObjectMetadataUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
  );
  assert.equal(
    blockIssue.relationTargetFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.blockedTasks,
  );
  assert.equal(blockedTasks.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(
    blockedTasks.relationTargetFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.blockIssue,
  );
});

test('the dependency is a SET_NULL task self-relation with a declared inverse', async () => {
  const graph = await loadGraph();
  const blockedBy = findFieldById(graph, TASK_FIELD_IDS.blockedBy);
  const blocks = findFieldById(graph, RELATION_IDS.blocks);

  assert.equal(blockedBy.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(blockedBy.universalSettings?.joinColumnName, 'blockedById');
  assert.equal(blockedBy.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(
    blockedBy.relationTargetObjectMetadataUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
  assert.equal(
    blockedBy.relationTargetFieldMetadataUniversalIdentifier,
    RELATION_IDS.blocks,
  );
  assert.equal(blocks.universalSettings?.relationType, 'ONE_TO_MANY');
  assert.equal(
    blocks.relationTargetFieldMetadataUniversalIdentifier,
    TASK_FIELD_IDS.blockedBy,
  );

  // blockIssue stays the task➜note relation; the dependency edge is additive.
  assert.equal(
    findFieldById(graph, TASK_FIELD_IDS.blockIssue)
      .relationTargetObjectMetadataUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
  );
});

test('the human id is a plain nullable TEXT field minted by the allocator', async () => {
  const graph = await loadGraph();
  const humanId = findFieldById(graph, TASK_FIELD_IDS.humanId);

  assert.equal(humanId.type, 'TEXT');
  assert.equal(humanId.name, 'humanId');
  assert.equal(humanId.isNullable, true);
});

test('the retroplanning provenance is a plain nullable TEXT field', async () => {
  const graph = await loadGraph();
  const provenance = findFieldById(graph, TASK_FIELD_IDS.retroplanningProvenance);

  assert.equal(provenance.type, 'TEXT');
  assert.equal(provenance.name, 'retroplanningProvenance');
  assert.equal(provenance.isNullable, true);
  assert.equal(
    provenance.objectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
});

test('time tracking keeps one timeEntry object related to task, project and member', async () => {
  const graph = await loadGraph();
  const timeEntryFields = graph.ownedFields.filter(
    ({ owningObjectUniversalIdentifier }) =>
      owningObjectUniversalIdentifier === OBJECT_IDS.timeEntry,
  );
  const embedded = (name: string) => {
    const match = timeEntryFields.find(({ field }) => field.name === name);

    assert.ok(match, `timeEntry.${name} missing`);

    return match.field;
  };

  const task = embedded('task');
  const project = embedded('project');
  const teamMember = embedded('teamMember');

  assert.equal(task.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(task.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(project.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(project.universalSettings?.onDelete, 'SET_NULL');
  assert.equal(teamMember.universalSettings?.relationType, 'MANY_TO_ONE');
  assert.equal(teamMember.universalSettings?.onDelete, 'CASCADE');

  // Their inverse sides live on the target objects, not on timeEntry.
  for (const inverseId of [
    RELATION_IDS.taskTimeEntries,
    RELATION_IDS.projectTimeEntries,
    RELATION_IDS.workspaceMemberTimeEntries,
  ]) {
    assert.equal(
      findFieldById(graph, inverseId).universalSettings?.relationType,
      'ONE_TO_MANY',
    );
  }

  assert.equal(
    graph.fieldById.get(RELATION_IDS.taskTimeEntries)?.owningObjectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  );
  assert.equal(
    graph.fieldById.get(RELATION_IDS.projectTimeEntries)?.owningObjectUniversalIdentifier,
    OBJECT_IDS.project,
  );
  assert.equal(
    graph.fieldById.get(RELATION_IDS.workspaceMemberTimeEntries)
      ?.owningObjectUniversalIdentifier,
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  );
});
