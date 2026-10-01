import {
  selectSuggestedTemplates,
  TEMPLATE_CREATE_SUGGESTIONS_COUNT,
} from '@/template-gallery/utils/selectSuggestedTemplates';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { type TemplateDescriptor } from 'twenty-shared/application';

const buildItem = ({
  key,
  category,
  available = true,
}: {
  key: string;
  category: TemplateDescriptor['category'];
  available?: boolean;
}): TemplateGalleryItem => ({
  descriptor: {
    key,
    version: 1,
    labels: { fr: key, en: key },
    category,
    preview: [],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: `${key}-app`,
    name: `${key}-app`,
  },
  available,
});

describe('selectSuggestedTemplates', () => {
  it('defaults to three suggestions', () => {
    expect(TEMPLATE_CREATE_SUGGESTIONS_COUNT).toBe(3);
  });

  it('keeps only the requested category, in descriptor order', () => {
    const items = [
      buildItem({ key: 'page-a', category: 'Pages' }),
      buildItem({ key: 'project-a', category: 'Projets' }),
      buildItem({ key: 'page-b', category: 'Pages' }),
      buildItem({ key: 'page-c', category: 'Pages' }),
      buildItem({ key: 'page-d', category: 'Pages' }),
    ];

    expect(
      selectSuggestedTemplates({ items, category: 'Pages' }).map(
        (item) => item.descriptor.key,
      ),
    ).toEqual(['page-a', 'page-b', 'page-c']);
  });

  it('drops suggestions whose required app is not installed', () => {
    const items = [
      buildItem({ key: 'page-a', category: 'Pages' }),
      buildItem({ key: 'page-b', category: 'Pages', available: false }),
      buildItem({ key: 'page-c', category: 'Pages' }),
    ];

    expect(
      selectSuggestedTemplates({ items, category: 'Pages' }).map(
        (item) => item.descriptor.key,
      ),
    ).toEqual(['page-a', 'page-c']);
  });

  it('returns every available item when no category narrows the surface', () => {
    const items = [
      buildItem({ key: 'page-a', category: 'Pages' }),
      buildItem({ key: 'project-a', category: 'Projets' }),
      buildItem({ key: 'agenda-a', category: 'Agenda' }),
      buildItem({ key: 'syna-a', category: 'Syna' }),
    ];

    expect(
      selectSuggestedTemplates({ items, category: null }).map(
        (item) => item.descriptor.key,
      ),
    ).toEqual(['page-a', 'project-a', 'agenda-a']);
  });

  it('takes the suggestion keys from the descriptor source of truth', () => {
    const items = [buildItem({ key: 'real-key', category: 'Pages' })];

    const suggestions = selectSuggestedTemplates({
      items,
      category: 'Pages',
    });

    expect(suggestions[0].descriptor.key).toBe(items[0].descriptor.key);
    expect(suggestions[0]).toBe(items[0]);
  });
});
