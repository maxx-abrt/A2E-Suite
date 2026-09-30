import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';
import { normalizeSearchText } from '~/utils/normalizeSearchText';

// The gallery's client-side filter: a category tab plus a free-text search over
// the bilingual labels, the stable key and the source app name (so the same
// template is findable in either language and by its app). A null category
// means "all".
export const filterTemplateGalleryItems = ({
  items,
  category,
  search,
}: {
  items: TemplateGalleryItem[];
  category: TemplateDescriptorCategory | null;
  search: string;
}): TemplateGalleryItem[] => {
  const normalizedSearch = normalizeSearchText(search.trim());

  return items.filter((item) => {
    if (isDefined(category) && item.descriptor.category !== category) {
      return false;
    }

    if (normalizedSearch === '') {
      return true;
    }

    return [
      item.descriptor.labels.fr,
      item.descriptor.labels.en,
      item.descriptor.key,
      item.sourceApplication.name,
    ].some((value) => normalizeSearchText(value).includes(normalizedSearch));
  });
};
