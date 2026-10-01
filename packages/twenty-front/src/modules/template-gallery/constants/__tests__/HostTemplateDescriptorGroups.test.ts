import { HOST_TEMPLATE_DESCRIPTOR_GROUPS } from '@/template-gallery/constants/HostTemplateDescriptorGroups';
import { buildTemplateGalleryItems } from '@/template-gallery/utils/buildTemplateGalleryItems';

describe('host template descriptor groups', () => {
  it('lists the six Agenda templates with their category and host source', () => {
    const items = buildTemplateGalleryItems({
      descriptorGroups: HOST_TEMPLATE_DESCRIPTOR_GROUPS,
      installedApplicationUniversalIdentifiers: [],
    });

    expect(items).toHaveLength(6);
    expect(items.every((item) => item.descriptor.category === 'Agenda')).toBe(
      true,
    );
    expect(items.every((item) => item.available)).toBe(true);
    expect(items[0].sourceApplication).toEqual({
      universalIdentifier: 'a2e-host-agenda',
      name: 'Agenda',
    });
  });
});
