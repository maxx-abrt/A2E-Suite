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
};

export type ContextToolContext = {
  applicationId?: string | null;
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

  if (!isDefined(context.applicationId) || context.applicationId.length === 0) {
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

    // Context mapping: only the tools of the app that owns the current view.
    if (applicationId !== context.applicationId) {
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
    });
  }

  return contextToolButtons.sort((first, second) =>
    first.label.localeCompare(second.label),
  );
};
