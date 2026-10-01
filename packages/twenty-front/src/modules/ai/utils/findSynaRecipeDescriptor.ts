import { SYNA_RECIPE_DESCRIPTORS } from '@/ai/constants/SynaRecipeDescriptors';
import { type SynaRecipeDescriptor } from '@/ai/types/SynaRecipeDescriptor';

// The finder lives outside `constants/` because that glob allows a single const
// declaration per file (twenty/max-consts-per-file); the descriptors file keeps
// its data and this keeps the lookup.
export const findSynaRecipeDescriptor = (
  key: string,
): SynaRecipeDescriptor | undefined =>
  SYNA_RECIPE_DESCRIPTORS.find((descriptor) => descriptor.key === key);
