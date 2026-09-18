import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  FRONT_COMPONENT_IDS,
  OBJECT_IDS,
  RELATION_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';
import { DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER } from '../../roles/default-function.role.ts';

// Whole-manifest graph walk for the P4.1 project object (the P4.1
// task-field-integrity walk, 55 fields / 6 objects, extended to the views,
// page-layouts, navigation-menu items and roles that reference them). The
// install path flattens every declaration into metadata and rejects a
// relation or view-field whose target is not resolvable, so a green suite
// here is the cheapest proof that installed relations, permissions and
// layouts resolve without duplicates or dangling targets. The live app
// install (role assignment, record-page rendering) stays a Tier-2 check.

type SelectOption = {
  id?: string;
  universalIdentifier?: string;
  value: string;
};

type RelationSettings = {
  relationType?: string;
};

type FieldDefinition = {
  universalIdentifier: string;
  objectUniversalIdentifier?: string;
  type: string;
  name: string;
  isNullable?: boolean;
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

type ViewFieldDefinition = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
};

type FieldReference = {
  universalIdentifier: string;
  fieldMetadataUniversalIdentifier: string;
};

type ViewGroupDefinition = {
  universalIdentifier: string;
};

type ViewDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  mainGroupByFieldMetadataUniversalIdentifier?: string;
  calendarFieldMetadataUniversalIdentifier?: string;
  fields?: ViewFieldDefinition[];
  sorts?: FieldReference[];
  filters?: FieldReference[];
  groups?: ViewGroupDefinition[];
};

type PageLayoutWidgetDefinition = {
  universalIdentifier: string;
  title: string;
  type: string;
  objectUniversalIdentifier?: string;
  configuration?: {
    configurationType: string;
    frontComponentUniversalIdentifier?: string;
  };
};

type PageLayoutTabDefinition = {
  universalIdentifier: string;
  title: string;
  widgets?: PageLayoutWidgetDefinition[];
};

type PageLayoutDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  tabs?: PageLayoutTabDefinition[];
};

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name: string;
  type: string;
  viewUniversalIdentifier?: string;
};

type RoleDefinition = {
  universalIdentifier: string;
  label: string;
  canReadAllObjectRecords: boolean;
  canUpdateAllObjectRecords: boolean;
  canSoftDeleteAllObjectRecords: boolean;
  canDestroyAllObjectRecords: boolean;
};

type StandardObjectDefinition = {
  universalIdentifier: string;
  fields?: Record<string, { universalIdentifier: string }>;
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
  '../../fields/task-estimate.field.ts',
  '../../fields/task-estimate-label.field.ts',
  '../../fields/task-human-id.field.ts',
  '../../fields/task-labels.field.ts',
  '../../fields/task-milestone.field.ts',
  '../../fields/task-priority.field.ts',
  '../../fields/task-project.field.ts',
  '../../fields/task-project-status.field.ts',
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
];

const VIEW_MODULE_PATHS = [
  '../../views/all-labels.view.ts',
  '../../views/all-milestones.view.ts',
  '../../views/all-projects.view.ts',
  '../../views/current-tasks.view.ts',
  '../../views/my-tasks.view.ts',
  '../../views/project-tasks.view.ts',
  '../../views/task-board.view.ts',
  '../../views/task-calendar.view.ts',
];

const PAGE_LAYOUT_MODULE_PATHS = ['../../page-layouts/project.page-layout.ts'];

const NAVIGATION_MENU_MODULE_PATHS = [
  '../../navigation-menu-items/my-tasks.navigation-menu-item.ts',
  '../../navigation-menu-items/projects.navigation-menu-item.ts',
];

const ROLE_MODULE_PATHS = ['../../roles/default-function.role.ts'];

type OwnedField = {
  origin: string;
  owningObjectUniversalIdentifier: string;
  field: FieldDefinition;
};

type Graph = {
  objects: ObjectDefinition[];
  objectIds: Set<string>;
  labelIdentifierByObject: Map<string, string | undefined>;
  ownedFields: OwnedField[];
  fieldById: Map<string, OwnedField>;
  views: ViewDefinition[];
  pageLayouts: PageLayoutDefinition[];
  navigationMenuItems: NavigationMenuItemDefinition[];
  roles: RoleDefinition[];
  resolvableObjectIds: Set<string>;
  resolvableFieldIds: Set<string>;
  frontComponentIds: Set<string>;
};

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

const readOptionId = (option: SelectOption): string =>
  option.id ?? option.universalIdentifier ?? '';

const standardObjects = Object.values(
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS as unknown as Record<
    string,
    StandardObjectDefinition
  >,
);

const standardObjectIds = new Set(
  standardObjects.map((object) => object.universalIdentifier),
);

const standardFieldIds = new Set<string>();

for (const object of standardObjects) {
  for (const field of Object.values(object.fields ?? {})) {
    standardFieldIds.add(field.universalIdentifier);
  }
}

const loadGraph = async (): Promise<Graph> => {
  const objects: ObjectDefinition[] = [];
  const objectIds = new Set<string>();
  const labelIdentifierByObject = new Map<string, string | undefined>();
  const ownedFields: OwnedField[] = [];

  for (const path of OBJECT_MODULE_PATHS) {
    const definition = await unwrap<ObjectDefinition>(path);

    objects.push(definition);
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

  const views: ViewDefinition[] = [];
  const pageLayouts: PageLayoutDefinition[] = [];
  const navigationMenuItems: NavigationMenuItemDefinition[] = [];
  const roles: RoleDefinition[] = [];

  for (const path of VIEW_MODULE_PATHS) {
    views.push(await unwrap<ViewDefinition>(path));
  }

  for (const path of PAGE_LAYOUT_MODULE_PATHS) {
    pageLayouts.push(await unwrap<PageLayoutDefinition>(path));
  }

  for (const path of NAVIGATION_MENU_MODULE_PATHS) {
    navigationMenuItems.push(await unwrap<NavigationMenuItemDefinition>(path));
  }

  for (const path of ROLE_MODULE_PATHS) {
    roles.push(await unwrap<RoleDefinition>(path));
  }

  return {
    objects,
    objectIds,
    labelIdentifierByObject,
    ownedFields,
    fieldById,
    views,
    pageLayouts,
    navigationMenuItems,
    roles,
    resolvableObjectIds: new Set([...objectIds, ...standardObjectIds]),
    resolvableFieldIds: new Set([...fieldById.keys(), ...standardFieldIds]),
    frontComponentIds: new Set(Object.values(FRONT_COMPONENT_IDS)),
  };
};

test('the app declares exactly one projectMember junction, one milestone and one timeEntry object', async () => {
  const graph = await loadGraph();
  const counts = new Map<string, number>();

  for (const object of graph.objects) {
    counts.set(
      object.universalIdentifier,
      (counts.get(object.universalIdentifier) ?? 0) + 1,
    );
  }

  assert.equal(graph.objects.length, 6);
  assert.equal(counts.get(OBJECT_IDS.project), 1);
  assert.equal(counts.get(OBJECT_IDS.milestone), 1);
  assert.equal(counts.get(OBJECT_IDS.projectMember), 1);
  assert.equal(counts.get(OBJECT_IDS.timeEntry), 1);
  assert.equal(counts.get(OBJECT_IDS.label), 1);
  assert.equal(counts.get(OBJECT_IDS.taskLabel), 1);

  const singulars = graph.objects.map((object) => object.nameSingular).sort();

  assert.deepEqual(singulars, [
    'label',
    'milestone',
    'project',
    'projectMember',
    'taskLabel',
    'timeEntry',
  ]);
});

test('no universal identifier is declared twice across the whole app manifest', async () => {
  const graph = await loadGraph();
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  const register = (identifier: string | undefined, origin: string) => {
    if (identifier === undefined || identifier.length === 0) {
      return;
    }

    if (seen.has(identifier)) {
      duplicates.push(`${identifier} in ${seen.get(identifier)} and ${origin}`);
      return;
    }

    seen.set(identifier, origin);
  };

  for (const object of graph.objects) {
    register(object.universalIdentifier, `object:${object.nameSingular}`);
  }

  for (const { origin, field } of graph.ownedFields) {
    register(field.universalIdentifier, origin);

    for (const option of field.options ?? []) {
      register(readOptionId(option), `${origin}:option`);
    }
  }

  for (const view of graph.views) {
    register(view.universalIdentifier, `view:${view.name}`);

    for (const [index, viewField] of (view.fields ?? []).entries()) {
      register(
        viewField.universalIdentifier,
        `view:${view.name}:field[${index}]`,
      );
    }

    for (const [index, sort] of (view.sorts ?? []).entries()) {
      register(sort.universalIdentifier, `view:${view.name}:sort[${index}]`);
    }

    for (const [index, filter] of (view.filters ?? []).entries()) {
      register(
        filter.universalIdentifier,
        `view:${view.name}:filter[${index}]`,
      );
    }

    for (const [index, group] of (view.groups ?? []).entries()) {
      register(group.universalIdentifier, `view:${view.name}:group[${index}]`);
    }
  }

  for (const layout of graph.pageLayouts) {
    register(layout.universalIdentifier, `pageLayout:${layout.name}`);

    for (const [tabIndex, tab] of (layout.tabs ?? []).entries()) {
      register(
        tab.universalIdentifier,
        `pageLayout:${layout.name}:tab[${tabIndex}]`,
      );

      for (const [widgetIndex, widget] of (tab.widgets ?? []).entries()) {
        register(
          widget.universalIdentifier,
          `pageLayout:${layout.name}:tab[${tabIndex}].widget[${widgetIndex}]`,
        );
      }
    }
  }

  for (const item of graph.navigationMenuItems) {
    register(item.universalIdentifier, `navigation:${item.name}`);
  }

  for (const role of graph.roles) {
    register(role.universalIdentifier, `role:${role.label}`);
  }

  assert.deepEqual(duplicates, []);
});

test('every relation target object and target field resolves', async () => {
  const graph = await loadGraph();
  const unresolved: string[] = [];

  for (const { origin, field } of graph.ownedFields) {
    if (field.type !== 'RELATION') {
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

  for (const {
    origin,
    owningObjectUniversalIdentifier,
    field,
  } of graph.ownedFields) {
    if (field.type !== 'RELATION') {
      continue;
    }

    const targetFieldId = field.relationTargetFieldMetadataUniversalIdentifier;
    const targetOwnedField =
      targetFieldId === undefined
        ? undefined
        : graph.fieldById.get(targetFieldId);

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

test('every view references a declared object and declared fields', async () => {
  const graph = await loadGraph();
  const unresolved: string[] = [];

  const checkField = (origin: string, identifier: string | undefined) => {
    // Optional single references (group-by, calendar field) are simply absent
    // on table views; only a present-but-unknown identifier is a defect.
    if (identifier === undefined) {
      return;
    }

    if (!graph.resolvableFieldIds.has(identifier)) {
      unresolved.push(`${origin} -> field ${identifier}`);
    }
  };

  for (const view of graph.views) {
    if (!graph.resolvableObjectIds.has(view.objectUniversalIdentifier)) {
      unresolved.push(
        `${view.name} -> object ${view.objectUniversalIdentifier}`,
      );
    }

    for (const [index, viewField] of (view.fields ?? []).entries()) {
      checkField(
        `${view.name}.field[${index}]`,
        viewField.fieldMetadataUniversalIdentifier,
      );
    }

    for (const [index, sort] of (view.sorts ?? []).entries()) {
      checkField(
        `${view.name}.sort[${index}]`,
        sort.fieldMetadataUniversalIdentifier,
      );
    }

    for (const [index, filter] of (view.filters ?? []).entries()) {
      checkField(
        `${view.name}.filter[${index}]`,
        filter.fieldMetadataUniversalIdentifier,
      );
    }

    checkField(
      `${view.name}.mainGroupBy`,
      view.mainGroupByFieldMetadataUniversalIdentifier,
    );
    checkField(
      `${view.name}.calendarField`,
      view.calendarFieldMetadataUniversalIdentifier,
    );
  }

  assert.deepEqual(unresolved, []);
});

test('every page-layout widget references existing metadata', async () => {
  const graph = await loadGraph();
  const unresolved: string[] = [];

  for (const layout of graph.pageLayouts) {
    if (!graph.resolvableObjectIds.has(layout.objectUniversalIdentifier)) {
      unresolved.push(
        `${layout.name} -> object ${layout.objectUniversalIdentifier}`,
      );
    }

    for (const [tabIndex, tab] of (layout.tabs ?? []).entries()) {
      for (const [widgetIndex, widget] of (tab.widgets ?? []).entries()) {
        const origin = `${layout.name}.tab[${tabIndex}].widget[${widgetIndex}] ${widget.title}`;

        if (
          widget.objectUniversalIdentifier !== undefined &&
          !graph.resolvableObjectIds.has(widget.objectUniversalIdentifier)
        ) {
          unresolved.push(
            `${origin} -> object ${widget.objectUniversalIdentifier}`,
          );
        }

        const frontComponent =
          widget.configuration?.frontComponentUniversalIdentifier;

        if (
          frontComponent !== undefined &&
          !graph.frontComponentIds.has(frontComponent)
        ) {
          unresolved.push(`${origin} -> front component ${frontComponent}`);
        }
      }
    }
  }

  assert.deepEqual(unresolved, []);
});

test('every VIEW navigation item and registered view identifier resolves', async () => {
  const graph = await loadGraph();
  const viewIds = new Set(graph.views.map((view) => view.universalIdentifier));
  const unresolved: string[] = [];

  for (const item of graph.navigationMenuItems) {
    if (item.type !== 'VIEW') {
      continue;
    }

    if (
      item.viewUniversalIdentifier === undefined ||
      !viewIds.has(item.viewUniversalIdentifier)
    ) {
      unresolved.push(
        `${item.name} -> view ${item.viewUniversalIdentifier ?? 'missing'}`,
      );
    }
  }

  for (const [key, identifier] of Object.entries(VIEW_IDS)) {
    if (!viewIds.has(identifier)) {
      unresolved.push(`VIEW_IDS.${key} -> ${identifier}`);
    }
  }

  assert.deepEqual(unresolved, []);
});

test('the default function role is declared once with least-privilege flags', async () => {
  const graph = await loadGraph();

  assert.equal(graph.roles.length, 1);

  const role = graph.roles[0];

  assert.equal(
    role.universalIdentifier,
    DEFAULT_FUNCTION_ROLE_UNIVERSAL_IDENTIFIER,
  );
  assert.equal(role.canReadAllObjectRecords, true);
  assert.equal(role.canUpdateAllObjectRecords, true);
  assert.equal(role.canSoftDeleteAllObjectRecords, true);
  assert.equal(role.canDestroyAllObjectRecords, false);
});

test('project budget and spent remain declared-only CURRENCY fields', async () => {
  const graph = await loadGraph();
  const projectFields = graph.ownedFields.filter(
    ({ owningObjectUniversalIdentifier }) =>
      owningObjectUniversalIdentifier === OBJECT_IDS.project,
  );

  const findField = (name: string): FieldDefinition => {
    const match = projectFields.find(({ field }) => field.name === name);

    assert.ok(match, `project.${name} missing`);

    return match.field;
  };

  const budget = findField('budget');
  const spent = findField('spent');

  assert.equal(
    budget.universalIdentifier,
    'c31b0200-0001-4000-8000-000000000009',
  );
  assert.equal(budget.type, 'CURRENCY');
  assert.equal(budget.isNullable, true);
  assert.equal(
    spent.universalIdentifier,
    'c31b0200-0001-4000-8000-00000000000a',
  );
  assert.equal(spent.type, 'CURRENCY');
  assert.equal(spent.isNullable, true);

  // P7.1c owns the wiring: no second finance field anywhere in the app.
  const financeFields = graph.ownedFields.filter(({ field }) =>
    ['budget', 'spent'].includes(field.name),
  );

  assert.deepEqual(financeFields.map(({ origin }) => origin).sort(), [
    'project.budget',
    'project.spent',
  ]);
});

test('every declared relation id is used by exactly one relation side', async () => {
  const graph = await loadGraph();
  const relationFields = graph.ownedFields.filter(
    ({ field }) => field.type === 'RELATION',
  );

  // A relation id must be a field declaration, never a bare constant that
  // resolves to nothing.
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
