import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// The exact template an entry-point asks the gallery to start on, alongside the
// category preselect (M7f Bureau landing deep-links a named starter). It is
// soft: if the key is absent from the loaded descriptors the gallery simply
// falls back to the category's first item, so a stale key degrades, never
// breaks the surface.
export const templateGalleryTemplateKeyPreselectState = createAtomState<
  string | null
>({
  key: 'templateGalleryTemplateKeyPreselectState',
  defaultValue: null,
});
