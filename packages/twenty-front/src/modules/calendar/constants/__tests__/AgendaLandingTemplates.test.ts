import { AGENDA_LANDING_TEMPLATE_CATEGORY } from '@/calendar/constants/AgendaLandingTemplateCategory';
import { AGENDA_LANDING_TEMPLATE_LINKS } from '@/calendar/constants/AgendaLandingTemplates';
import { AGENDA_TEMPLATE_DESCRIPTORS } from '@/calendar/constants/AgendaTemplateDescriptors';

// M7f drift guard: the Agenda home's featured links must always resolve to a
// descriptor the gallery actually ships under the Agenda category, so a rename
// on either side fails here rather than silently landing on an empty gallery.
describe('Agenda landing template links', () => {
  it('features exactly three starters', () => {
    expect(AGENDA_LANDING_TEMPLATE_LINKS).toHaveLength(3);
  });

  it('resolves every featured key to a shipped Agenda descriptor', () => {
    for (const templateLink of AGENDA_LANDING_TEMPLATE_LINKS) {
      const descriptor = AGENDA_TEMPLATE_DESCRIPTORS.find(
        (candidate) => candidate.key === templateLink.descriptorKey,
      );

      expect(descriptor).toBeDefined();
      expect(descriptor?.category).toBe(AGENDA_LANDING_TEMPLATE_CATEGORY);
    }
  });
});
