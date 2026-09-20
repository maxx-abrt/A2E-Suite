import { ToolCategory } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { type ContextToolButton } from '@/ai/types/ContextToolButton';

export type ContextToolIndexEntry = {
  name: string;
  label: string;
  description: string;
  category: string;
};

export type ContextToolLogicFunction = {
  name: string;
  applicationId?: string | null;
  // The app-declared `toolTriggerSettings.inputSchema`, read straight from the
  // metadata store — no extra registry call, and no server change.
  inputSchema?: unknown;
};

export type ContextToolContext = {
  applicationId?: string | null;
  objectNameSingular?: string | null;
  objectUniversalIdentifier?: string | null;
};

type ContextToolInputSchema = {
  objectUniversalIdentifier?: string;
  properties?: Record<string, ContextToolInputSchema>;
  items?: ContextToolInputSchema;
  additionalProperties?: boolean | ContextToolInputSchema;
};

const isContextToolInputSchema = (
  value: unknown,
): value is ContextToolInputSchema =>
  typeof value === 'object' && value !== null;

// The app format names a record-reference input after the object it points at
// (`documentId`, `projectIds`, …). A property is only ever matched when it
// names the current object, so a tool is never offered for a context it cannot
// address.
const RECORD_ID_PROPERTY_SUFFIXES = ['Id', 'Ids', 'Uid', 'Uids'] as const;

const getRecordIdPropertyNames = (objectNameSingular: string): Set<string> =>
  new Set(
    RECORD_ID_PROPERTY_SUFFIXES.map(
      (suffix) => `${objectNameSingular}${suffix}`,
    ),
  );

// Input-schema-aware mapping: a read-only tool qualifies for the current
// context when its declared input references the context object, even if
// another app owns that object (the cross-app case). Unreadable schemas fail
// closed.
export const toolInputSchemaReferencesObject = ({
  inputSchema,
  objectNameSingular,
  objectUniversalIdentifier,
}: {
  inputSchema: unknown;
  objectNameSingular?: string | null;
  objectUniversalIdentifier?: string | null;
}): boolean => {
  if (!isContextToolInputSchema(inputSchema)) {
    return false;
  }

  const recordIdPropertyNames =
    isDefined(objectNameSingular) && objectNameSingular.length > 0
      ? getRecordIdPropertyNames(objectNameSingular)
      : undefined;
  const hasUniversalIdentifier =
    isDefined(objectUniversalIdentifier) &&
    objectUniversalIdentifier.length > 0;

  const visit = (schema: ContextToolInputSchema): boolean => {
    if (
      hasUniversalIdentifier &&
      schema.objectUniversalIdentifier === objectUniversalIdentifier
    ) {
      return true;
    }

    if (isDefined(recordIdPropertyNames) && isDefined(schema.properties)) {
      for (const propertyName of Object.keys(schema.properties)) {
        if (recordIdPropertyNames.has(propertyName)) {
          return true;
        }
      }
    }

    const childSchemas = [
      ...Object.values(schema.properties ?? {}),
      ...(isContextToolInputSchema(schema.items) ? [schema.items] : []),
      ...(isContextToolInputSchema(schema.additionalProperties)
        ? [schema.additionalProperties]
        : []),
    ];

    return childSchemas.some(visit);
  };

  return visit(inputSchema);
};

// Mirrors the server's LogicFunctionToolProvider.buildLogicFunctionToolName so
// a registry tool name can be traced back to its owning app through the
// metadata-store logic functions — no per-tool front registration.
export const buildLogicFunctionToolName = (functionName: string): string =>
  `app_${functionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')}`;

export const humanizeToolLabel = (label: string): string =>
  label
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

// Fail-closed mutability policy: only app-declared logic-function tools are
// dispatchable as read-only context buttons. Every other registry category
// (ACTION, DATABASE_CRUD, …) can mutate and is left to the draft+confirm path.
export const isReadOnlyTool = (category: string): boolean =>
  category === ToolCategory.LOGIC_FUNCTION;

export const getContextToolButtons = ({
  toolIndex,
  logicFunctions,
  installedApplicationIds,
  context,
  canReadContextObject,
}: {
  toolIndex: ContextToolIndexEntry[];
  logicFunctions: ContextToolLogicFunction[];
  installedApplicationIds: Set<string>;
  context: ContextToolContext | null;
  canReadContextObject: boolean;
}): ContextToolButton[] => {
  if (!isDefined(context) || !canReadContextObject) {
    return [];
  }

  const hasContextApplication =
    isDefined(context.applicationId) && context.applicationId.length > 0;
  const hasContextObject =
    (isDefined(context.objectNameSingular) &&
      context.objectNameSingular.length > 0) ||
    (isDefined(context.objectUniversalIdentifier) &&
      context.objectUniversalIdentifier.length > 0);

  if (!hasContextApplication && !hasContextObject) {
    return [];
  }

  const logicFunctionByToolName = new Map<string, ContextToolLogicFunction>();

  for (const logicFunction of logicFunctions) {
    if (isDefined(logicFunction.name) && logicFunction.name.length > 0) {
      logicFunctionByToolName.set(
        buildLogicFunctionToolName(logicFunction.name),
        logicFunction,
      );
    }
  }

  const offeredToolNames = new Set<string>();
  const contextToolButtons: ContextToolButton[] = [];

  for (const tool of toolIndex) {
    if (!isReadOnlyTool(tool.category) || offeredToolNames.has(tool.name)) {
      continue;
    }

    const logicFunction = logicFunctionByToolName.get(tool.name);

    // Fail-closed: a tool whose owning app cannot be resolved is never offered.
    if (!isDefined(logicFunction)) {
      continue;
    }

    const applicationId = logicFunction.applicationId;

    if (!isDefined(applicationId) || applicationId.length === 0) {
      continue;
    }

    // Fail-closed: an uninstalled app's tools are never offered.
    if (!installedApplicationIds.has(applicationId)) {
      continue;
    }

    // Context mapping: the tools of the app that owns the current view, plus
    // any app tool whose input schema addresses the current object (the
    // cross-app case, e.g. a project tool reading the open document).
    const ownsContextApplication =
      hasContextApplication && applicationId === context.applicationId;
    const referencesContextObject =
      !ownsContextApplication &&
      toolInputSchemaReferencesObject({
        inputSchema: logicFunction.inputSchema,
        objectNameSingular: context.objectNameSingular,
        objectUniversalIdentifier: context.objectUniversalIdentifier,
      });

    if (!ownsContextApplication && !referencesContextObject) {
      continue;
    }

    offeredToolNames.add(tool.name);

    contextToolButtons.push({
      toolName: tool.name,
      label: humanizeToolLabel(tool.label),
      description: tool.description,
      applicationId,
      readOnly: true,
      requiresConfirmation: false,
      inputSchema: logicFunction.inputSchema,
    });
  }

  return contextToolButtons.sort((first, second) =>
    first.label.localeCompare(second.label),
  );
};
