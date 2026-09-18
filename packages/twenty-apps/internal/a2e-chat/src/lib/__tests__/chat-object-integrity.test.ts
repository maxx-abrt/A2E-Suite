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

// Whole-manifest graph walk for the P5.1 chat objects (the P4.1
// project-object-integrity walk, trimmed to chat). The install path flattens
// every declaration into metadata and rejects a relation or view-field whose
// target is not resolvable, so a green suite here is the cheapest proof that
// the installed relations, views, layouts and role resolve without
// duplicates or dangling targets. The live app install stays Tier 2.

type SelectOption = {
  id?: string;
  universalIdentifier?: string;
  value: string;
};

type FieldDefinition = {
  universalIdentifier: string;
  objectUniversalIdentifier?: string;
  type: string;
  name: string;
  options?: SelectOption[];
  relationTargetObjectMetadataUniversalIdentifier?: string;
  relationTargetFieldMetadataUniversalIdentifier?: string;
  universalSettings?: { relationType?: string };
};

type ObjectDefinition = {
  universalIdentifier: string;
  nameSingular: string;
  labelIdentifierFieldMetadataUniversalIdentifier?: string;
  fields: FieldDefinition[];
};

type ViewDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  fields?: {
    universalIdentifier: string;
    fieldMetadataUniversalIdentifier: string;
  }[];
  sorts?: {
    universalIdentifier: string;
    fieldMetadataUniversalIdentifier: string;
  }[];
};

type PageLayoutDefinition = {
  universalIdentifier: string;
  name: string;
  objectUniversalIdentifier: string;
  tabs?: {
    universalIdentifier: string;
    title: string;
    widgets?: {
      universalIdentifier: string;
      type: string;
      objectUniversalIdentifier?: string;
      configuration?: { configurationType: string };
    }[];
  }[];
};

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name?: string;
  type: string;
  viewUniversalIdentifier?: string;
};

type CommandMenuItemDefinition = {
  universalIdentifier: string;
  label: string;
  frontComponentUniversalIdentifier: string;
};

type RoleDefinition = {
  universalIdentifier: string;
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
  '../../objects/chat-channel.object.ts',
  '../../objects/chat-channel-member.object.ts',
  '../../objects/chat-message.object.ts',
  '../../objects/chat-reaction.object.ts',
  '../../objects/chat-read-cursor.object.ts',
];

const FIELD_MODULE_PATHS = [
  '../../fields/workspace-member-channel-memberships.field.ts',
  '../../fields/workspace-member-messages.field.ts',
  '../../fields/workspace-member-reactions.field.ts',
  '../../fields/workspace-member-read-cursors.field.ts',
];

const VIEW_MODULE_PATHS = [
  '../../views/all-channels.view.ts',
  '../../views/all-channel-members.view.ts',
  '../../views/all-messages.view.ts',
];

const PAGE_LAYOUT_MODULE_PATHS = [
  '../../page-layouts/chat-channel.page-layout.ts',
  '../../page-layouts/chat-message.page-layout.ts',
];

const NAVIGATION_MENU_MODULE_PATHS = [
  '../../navigation-menu-items/channels.navigation-menu-item.ts',
];

const COMMAND_MENU_MODULE_PATHS = [
  '../../command-menu-items/create-channel.command-menu-item.ts',
  '../../command-menu-items/go-to-chat.command-menu-item.ts',
];

const ROLE_MODULE_PATHS = ['../../roles/default-function.role.ts'];

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

type OwnedField = {
  origin: string;
  owningObjectUniversalIdentifier: string;
  field: FieldDefinition;
};

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

  const views: ViewDefinition[] = [];
  const pageLayouts: PageLayoutDefinition[] = [];
  const navigationMenuItems: NavigationMenuItemDefinition[] = [];
  const commandMenuItems: CommandMenuItemDefinition[] = [];
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

  for (const path of COMMAND_MENU_MODULE_PATHS) {
    commandMenuItems.push(await unwrap<CommandMenuItemDefinition>(path));
  }

  for (const path of ROLE_MODULE_PATHS) {
    roles.push(await unwrap<RoleDefinition>(path));
  }

  return {
    objects,
    objectIds,
    ownedFields,
    fieldById,
    views,
    pageLayouts,
    navigationMenuItems,
    commandMenuItems,
    roles,
    resolvableObjectIds: new Set([...objectIds, ...standardObjectIds]),
    resolvableFieldIds: new Set([...fieldById.keys(), ...standardFieldIds]),
    frontComponentIds: new Set<string>(Object.values(FRONT_COMPONENT_IDS)),
  };
};

test('the app declares exactly the five chat objects', async () => {
  const graph = await loadGraph();
  const singulars = graph.objects.map((object) => object.nameSingular).sort();

  assert.deepEqual(singulars, [
    'chatChannel',
    'chatChannelMember',
    'chatMessage',
    'chatReaction',
    'chatReadCursor',
  ]);
  assert.equal(graph.objects.length, 5);

  for (const objectId of Object.values(OBJECT_IDS)) {
    assert.equal(
      graph.objects.filter((object) => object.universalIdentifier === objectId)
        .length,
      1,
    );
  }
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
    register(item.universalIdentifier, `navigation:${item.name ?? ''}`);
  }

  for (const item of graph.commandMenuItems) {
    register(item.universalIdentifier, `command:${item.label}`);
  }

  for (const role of graph.roles) {
    register(role.universalIdentifier, 'role');
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

test('every view references a declared object and declared fields', async () => {
  const graph = await loadGraph();
  const unresolved: string[] = [];

  const checkField = (origin: string, identifier: string | undefined) => {
    if (identifier !== undefined && !graph.resolvableFieldIds.has(identifier)) {
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
        if (
          widget.objectUniversalIdentifier !== undefined &&
          !graph.resolvableObjectIds.has(widget.objectUniversalIdentifier)
        ) {
          unresolved.push(
            `${layout.name}.tab[${tabIndex}].widget[${widgetIndex}] -> object ${widget.objectUniversalIdentifier}`,
          );
        }
      }
    }
  }

  assert.deepEqual(unresolved, []);
});

test('the navigation item resolves to a declared view and commands resolve to front components', async () => {
  const graph = await loadGraph();
  const viewIds = new Set(graph.views.map((view) => view.universalIdentifier));
  const unresolved: string[] = [];

  for (const item of graph.navigationMenuItems) {
    if (
      item.type === 'VIEW' &&
      (item.viewUniversalIdentifier === undefined ||
        !viewIds.has(item.viewUniversalIdentifier))
    ) {
      unresolved.push(
        `${item.name ?? ''} -> view ${item.viewUniversalIdentifier ?? 'missing'}`,
      );
    }
  }

  for (const item of graph.commandMenuItems) {
    if (!graph.frontComponentIds.has(item.frontComponentUniversalIdentifier)) {
      unresolved.push(
        `${item.label} -> front component ${item.frontComponentUniversalIdentifier}`,
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

test('every declared relation id is used by exactly one relation side', async () => {
  const graph = await loadGraph();
  const relationFields = graph.ownedFields.filter(
    ({ field }) => field.type === 'RELATION',
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
