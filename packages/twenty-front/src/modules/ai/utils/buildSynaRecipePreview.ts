import { findSynaRecipeDescriptor } from '@/ai/utils/findSynaRecipeDescriptor';
import { type SynaRecipePreview } from '@/ai/types/SynaRecipeDescriptor';
import { isDefined } from 'twenty-shared/utils';

// Trigger → preview: given the recipe the user picked, return the writes it
// will declare before anything runs. The preview is pure data (the C1
// "show what will be created" rule); a missing key is undefined rather than an
// empty preview, so a caller can tell "unknown recipe" from "no writes".
export const buildSynaRecipePreview = (
  key: string,
): SynaRecipePreview | undefined => {
  const descriptor = findSynaRecipeDescriptor(key);

  if (!isDefined(descriptor)) {
    return undefined;
  }

  return {
    key: descriptor.key,
    status: descriptor.status,
    writes: descriptor.preview,
  };
};
