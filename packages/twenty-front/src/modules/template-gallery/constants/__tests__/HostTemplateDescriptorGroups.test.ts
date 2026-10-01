import { HOST_TEMPLATE_DESCRIPTOR_GROUPS } from '@/template-gallery/constants/HostTemplateDescriptorGroups';
import { buildTemplateGalleryItems } from '@/template-gallery/utils/buildTemplateGalleryItems';

describe('host template descriptor groups', () => {
  const buildItems = () =>
    buildTemplateGalleryItems({
      descriptorGroups: HOST_TEMPLATE_DESCRIPTOR_GROUPS,
      installedApplicationUniversalIdentifiers: [],
    });

  it('lists the six Agenda templates with their category and host source', () => {
    const agendaItems = buildItems().filter(
      (item) => item.descriptor.category === 'Agenda',
    );

    expect(agendaItems).toHaveLength(6);
    expect(agendaItems.every((item) => item.available)).toBe(true);
    expect(agendaItems[0].sourceApplication).toEqual({
      universalIdentifier: 'a2e-host-agenda',
      name: 'Agenda',
    });
  });

  it('lists the seven ready Syna recipes with their host source', () => {
    const synaItems = buildItems().filter(
      (item) => item.descriptor.category === 'Syna',
    );

    expect(synaItems).toHaveLength(7);
    expect(synaItems[0].sourceApplication).toEqual({
      universalIdentifier: 'a2e-host-syna',
      name: 'Syna',
    });
  });

  it('never projects the P7-deferred invoice recipe into the gallery', () => {
    const keys = buildItems().map((item) => item.descriptor.key);

    expect(keys).not.toContain('syna-facture-depuis-temps');
  });
});
