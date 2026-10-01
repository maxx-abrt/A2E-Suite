import { ARCHIVE_LANDING_TEMPLATE_CATEGORY } from '@/drive/constants/ArchiveLandingTemplateCategory';
import { ARCHIVE_LANDING_TEMPLATE_LINKS } from '@/drive/constants/ArchiveLandingTemplates';

// M7f: the Archive home features three M9c folder-structure starters under the
// Archive gallery category. The keys are validated against a2e-drive's shipped
// descriptors by the app-side drift guard
// (a2e-drive/src/lib/__tests__/archive-landing-template-links.test.ts), which
// reads this host constant — neither package can import the other.
describe('Archive landing template links', () => {
  it('features exactly three starters', () => {
    expect(ARCHIVE_LANDING_TEMPLATE_LINKS).toHaveLength(3);
  });

  it('uses unique descriptor keys and the Archive category', () => {
    const keys = ARCHIVE_LANDING_TEMPLATE_LINKS.map(
      (templateLink) => templateLink.descriptorKey,
    );

    expect(new Set(keys).size).toBe(3);
    expect(ARCHIVE_LANDING_TEMPLATE_CATEGORY).toBe('Archive');
  });
});
