import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

// Three is the PLAN M13a contract for the create chooser.
export const TEMPLATE_CREATE_SUGGESTIONS_COUNT = 3;

// The context-aware suggestions a create surface shows above "Browse all".
// They are read from the same install-gated descriptor list the gallery renders
// (never a hand-picked constant), so adding or reordering a template in its app
// changes the chooser with it — the descriptor list stays the single source of
// truth. Availability is honoured here for the same reason the gallery gates
// `Use template`: a suggestion whose required app is missing is not offered.
//
// Persona weighting is deliberately absent: PLAN M13a allows it "only where
// preset context exists" and no preset context ships yet, so the current app
// category is the only context. Do not add a scoring list here ahead of D02's
// app-set expansion.
export const selectSuggestedTemplates = ({
  items,
  category,
  limit = TEMPLATE_CREATE_SUGGESTIONS_COUNT,
}: {
  items: TemplateGalleryItem[];
  category: TemplateDescriptorCategory | null;
  limit?: number;
}): TemplateGalleryItem[] =>
  items
    .filter(
      (item) =>
        item.available &&
        (!isDefined(category) || item.descriptor.category === category),
    )
    .slice(0, limit);
