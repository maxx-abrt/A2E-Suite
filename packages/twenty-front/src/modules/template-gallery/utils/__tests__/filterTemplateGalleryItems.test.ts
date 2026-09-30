import { filterTemplateGalleryItems } from '@/template-gallery/utils/filterTemplateGalleryItems';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { type TemplateDescriptor } from 'twenty-shared/application';

const documentsItem: TemplateGalleryItem = {
  descriptor: {
    key: 'notes-reunion',
    version: 1,
    labels: { fr: 'Notes de réunion', en: 'Meeting notes' },
    category: 'Pages',
    preview: [],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: 'a2e-documents-universal-identifier',
    name: 'A2E Documents',
  },
  available: true,
};

const projectsItem: TemplateGalleryItem = {
  descriptor: {
    key: 'client-onboarding',
    version: 1,
    labels: { fr: 'Onboarding client', en: 'Client onboarding' },
    category: 'Projets',
    preview: [],
    requiredApps: [],
    inputs: [],
  } satisfies TemplateDescriptor,
  sourceApplication: {
    universalIdentifier: 'a2e-projects-universal-identifier',
    name: 'A2E Projects',
  },
  available: true,
};

describe('filterTemplateGalleryItems', () => {
  it('returns every item when there is no category nor search', () => {
    const items = filterTemplateGalleryItems({
      items: [documentsItem, projectsItem],
      category: null,
      search: '',
    });

    expect(items).toHaveLength(2);
  });

  it('filters by category', () => {
    const items = filterTemplateGalleryItems({
      items: [documentsItem, projectsItem],
      category: 'Projets',
      search: '',
    });

    expect(items).toEqual([projectsItem]);
  });

  it('matches the French label ignoring diacritics', () => {
    const items = filterTemplateGalleryItems({
      items: [documentsItem, projectsItem],
      category: null,
      search: 'reunion',
    });

    expect(items).toEqual([documentsItem]);
  });

  it('matches the diagnostic key and the source application name', () => {
    const byKey = filterTemplateGalleryItems({
      items: [documentsItem, projectsItem],
      category: null,
      search: 'client-onboarding',
    });
    const byApplication = filterTemplateGalleryItems({
      items: [documentsItem, projectsItem],
      category: null,
      search: 'projects',
    });

    expect(byKey).toEqual([projectsItem]);
    expect(byApplication).toEqual([projectsItem]);
  });
});
