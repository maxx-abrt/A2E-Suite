import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';

// The category an entry-point asks the gallery to start on. It is a soft
// preselect (M9a-4 AC5): the gallery applies it once as its initial tab and the
// user can clear or change it, so an app-scoped entry-point never traps the
// user in a hard filter.
export const templateGalleryCategoryPreselectState =
  createAtomState<TemplateDescriptorCategory | null>({
    key: 'templateGalleryCategoryPreselectState',
    defaultValue: null,
  });
