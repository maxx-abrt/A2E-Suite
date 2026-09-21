import { isNonEmptyString } from '@sniptt/guards';
import { ToolCategory } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';

export type DirectToolInvocationDecision =
  | { kind: 'none' }
  | { kind: 'force'; toolName: string }
  | { kind: 'skip-mutating' }
  | { kind: 'refuse' };

// Fail-closed: the forced name must already resolve in the caller-scoped
// catalogue (role + workspace), so an unknown, uninstalled, restricted-member or
// cross-workspace tool refuses before any provider call with the same single
// error — no "forbidden" surface, no existence leak. Only the read-only
// category may be auto-executed: a mutating tool is skipped, never forced, so
// its turn stays on the normal path where C6 still asks for the prefill draft.
export const resolveDirectToolInvocation = ({
  directToolInvocation,
  toolCatalog,
}: {
  directToolInvocation: string | null | undefined;
  toolCatalog: ToolIndexEntry[];
}): DirectToolInvocationDecision => {
  if (!isNonEmptyString(directToolInvocation)) {
    return { kind: 'none' };
  }

  const entry = toolCatalog.find(
    (catalogEntry) => catalogEntry.name === directToolInvocation,
  );

  if (!isDefined(entry)) {
    return { kind: 'refuse' };
  }

  if (entry.category !== ToolCategory.LOGIC_FUNCTION) {
    return { kind: 'skip-mutating' };
  }

  return { kind: 'force', toolName: directToolInvocation };
};
