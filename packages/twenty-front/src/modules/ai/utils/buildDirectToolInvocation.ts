import { isDefined } from 'twenty-shared/utils';

import { type BrowsingContext } from '@/ai/types/BrowsingContext';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import {
  type DirectToolInvocation,
  type DirectToolRefusalReason,
} from '@/ai/types/DirectToolInvocation';

export type DirectToolInvocationBuildResult =
  | { kind: 'invocation'; invocation: DirectToolInvocation }
  | { kind: 'refused'; reason: DirectToolRefusalReason };

type JsonSchemaShape = {
  required?: unknown;
  properties?: Record<string, unknown>;
};

const getRequiredPropertyNames = (inputSchema: unknown): string[] => {
  if (typeof inputSchema !== 'object' || inputSchema === null) {
    return [];
  }

  const { required } = inputSchema as JsonSchemaShape;

  return Array.isArray(required)
    ? required.filter((name): name is string => typeof name === 'string')
    : [];
};

// The app format names a record-reference input after the object it points at
// (`documentId`, `channelId`, …) — the same convention the surfacing mapping
// reads. Only the fields the browsing context can supply are filled; anything
// else is left for the required-field gate below to refuse.
const getContextArguments = (
  browsingContext: BrowsingContext,
): Record<string, unknown> => {
  switch (browsingContext.type) {
    case 'recordPage':
      return {
        [`${browsingContext.objectNameSingular}Id`]: browsingContext.recordId,
      };
    case 'chatChannel':
      return { channelId: browsingContext.channelId };
    case 'listView':
      return {};
  }
};

// Fail-closed: a button only becomes a direct invocation when it is read-only,
// there is a browsing context to fill from, and every required input the tool
// declares is satisfiable from that context. A missing target never dispatches
// partial arguments.
export const buildDirectToolInvocation = ({
  contextToolButton,
  browsingContext,
}: {
  contextToolButton: ContextToolButton;
  browsingContext: BrowsingContext | null;
}): DirectToolInvocationBuildResult => {
  if (!contextToolButton.readOnly) {
    return { kind: 'refused', reason: 'MUTATING_TOOL_NOT_DIRECTLY_EXECUTABLE' };
  }

  if (!isDefined(browsingContext)) {
    return { kind: 'refused', reason: 'NO_BROWSING_CONTEXT' };
  }

  const contextArguments = getContextArguments(browsingContext);
  const missingRequiredPropertyNames = getRequiredPropertyNames(
    contextToolButton.inputSchema,
  ).filter((propertyName) => !isDefined(contextArguments[propertyName]));

  if (missingRequiredPropertyNames.length > 0) {
    return { kind: 'refused', reason: 'MISSING_REQUIRED_INPUT' };
  }

  return {
    kind: 'invocation',
    invocation: {
      toolName: contextToolButton.toolName,
      arguments: contextArguments,
    },
  };
};
