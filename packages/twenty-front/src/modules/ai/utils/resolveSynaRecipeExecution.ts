import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';
import { type SynaRecipeExecution } from '@/ai/types/SynaRecipeDescriptor';
import { isDefined } from 'twenty-shared/utils';

// Execution resolution: the host asks this before running a recipe. A READY
// recipe reports the tool it stages; a DEFERRED recipe reports its gate instead
// of half-running. An unknown key is undefined (fail-closed at the call site).
export const resolveSynaRecipeExecution = (
  key: string,
): SynaRecipeExecution | undefined => {
  const descriptor = findSynaRecipeDescriptor(key);

  if (!isDefined(descriptor)) {
    return undefined;
  }

  if (descriptor.status === 'DEFERRED') {
    return {
      status: 'DEFERRED',
      gatedBy: descriptor.deferral?.gatedBy ?? 'UNKNOWN',
    };
  }

  return { status: 'READY', requiredToolName: descriptor.requiredToolName };
};
