import { t } from '@lingui/core/macro';

import { type DirectToolInvocation } from '@/ai/types/DirectToolInvocation';

// The context button already resolved the tool and its arguments; the message
// carries them verbatim so the assistant executes the named read-only tool
// instead of guessing one from prose.
export const buildDirectToolExecutionMessage = (
  invocation: DirectToolInvocation,
): string => {
  const serializedArguments = JSON.stringify(invocation.arguments);

  return t`Run the "${invocation.toolName}" tool now with exactly these arguments: ${serializedArguments}. Do not ask for confirmation.`;
};
