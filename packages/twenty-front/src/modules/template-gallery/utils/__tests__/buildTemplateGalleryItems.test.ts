import { buildTemplateGalleryItems } from '@/template-gallery/utils/buildTemplateGalleryItems';
import { type TemplateGalleryDescriptorGroup } from '@/template-gallery/types/TemplateGalleryDescriptorGroup';
import { type TemplateDescriptor } from 'twenty-shared/application';

const ownAppDescriptor: TemplateDescriptor = {
  key: 'notes-reunion',
  version: 1,
  labels: { fr: 'Notes de réunion', en: 'Meeting notes' },
  category: 'Pages',
  preview: [
    {
      object: 'document',
      summary: { fr: 'Crée une page', en: 'Creates a page' },
      count: 1,
    },
  ],
  requiredApps: [],
  inputs: [],
};

const dependentDescriptor: TemplateDescriptor = {
  key: 'client-onboarding',
  version: 1,
  labels: { fr: 'Onboarding client', en: 'Client onboarding' },
  category: 'Projets',
  preview: [
    {
      object: 'project',
      summary: { fr: 'Crée un projet', en: 'Creates a project' },
      count: 1,
    },
  ],
  requiredApps: ['a2e-accounting-universal-identifier'],
  inputs: [],
};

const descriptorGroups: TemplateGalleryDescriptorGroup[] = [
  {
    applicationUniversalIdentifier: 'a2e-documents-universal-identifier',
    applicationName: 'A2E Documents',
    templates: [ownAppDescriptor, dependentDescriptor],
  },
];

describe('buildTemplateGalleryItems', () => {
  it('attributes every descriptor to its source application', () => {
    const items = buildTemplateGalleryItems({
      descriptorGroups,
      installedApplicationUniversalIdentifiers: [
        'a2e-documents-universal-identifier',
        'a2e-accounting-universal-identifier',
      ],
    });

    expect(items).toHaveLength(2);
    expect(items[0].sourceApplication).toEqual({
      universalIdentifier: 'a2e-documents-universal-identifier',
      name: 'A2E Documents',
    });
  });

  it('marks a descriptor available when it requires no sibling app', () => {
    const items = buildTemplateGalleryItems({
      descriptorGroups,
      installedApplicationUniversalIdentifiers: [
        'a2e-documents-universal-identifier',
      ],
    });

    expect(items[0].available).toBe(true);
  });

  it('marks a descriptor unavailable when a required app is not installed', () => {
    const items = buildTemplateGalleryItems({
      descriptorGroups,
      installedApplicationUniversalIdentifiers: [
        'a2e-documents-universal-identifier',
      ],
    });

    expect(items[1].available).toBe(false);
  });

  it('marks a descriptor available when every required app is installed', () => {
    const items = buildTemplateGalleryItems({
      descriptorGroups,
      installedApplicationUniversalIdentifiers: [
        'a2e-documents-universal-identifier',
        'a2e-accounting-universal-identifier',
      ],
    });

    expect(items[1].available).toBe(true);
  });
});
