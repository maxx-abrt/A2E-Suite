import { A2E_EMPTY_STATE_SURFACES } from '@/a2e-empty-state/constants/A2eEmptyStateSurfaces';
import { getA2eEmptyStateSurfaceForObject } from '@/a2e-empty-state/utils/getA2eEmptyStateSurfaceForObject';
import { getA2eHelpDocUrl } from '@/a2e-help/constants/A2eHelpDocPages';
import { HOST_TEMPLATE_DESCRIPTOR_GROUPS } from '@/template-gallery/constants/HostTemplateDescriptorGroups';
import { i18n } from '@lingui/core';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

// The gallery category union (`TemplateDescriptorCategory`); a category that is
// not in it could never resolve in the M9 gallery. App-owned categories
// ('Pages') are also asserted through their shipped descriptor groups below.
const KNOWN_TEMPLATE_DESCRIPTOR_CATEGORIES = [
  'Pages',
  'Projets',
  'Bilan',
  'Archive',
  'Agenda',
  'Syna',
  'Automatisations',
];

beforeAll(async () => {
  await dynamicActivate(SOURCE_LOCALE);
});

describe('A2E_EMPTY_STATE_SURFACES', () => {
  it('gives every surface one sentence, one primary action and a learn-more doc', () => {
    Object.values(A2E_EMPTY_STATE_SURFACES).forEach((surface) => {
      expect(i18n._(surface.sentence).trim().length).toBeGreaterThan(0);
      expect(i18n._(surface.primaryActionLabel).trim().length).toBeGreaterThan(
        0,
      );
      expect(surface.primaryActionIcon).toBeDefined();
      expect(getA2eHelpDocUrl(surface.appKey)).toContain(
        '/user-guide/a2e-suite/',
      );
    });
  });

  it('uses only real gallery categories', () => {
    const hostCategories = HOST_TEMPLATE_DESCRIPTOR_GROUPS.flatMap((group) =>
      group.templates.map((template) => template.category),
    );

    Object.values(A2E_EMPTY_STATE_SURFACES).forEach((surface) => {
      expect(KNOWN_TEMPLATE_DESCRIPTOR_CATEGORIES).toContain(
        surface.templateCategory,
      );
    });

    // Agenda + tasks point at the host Agenda family, which must really exist.
    expect(hostCategories).toContain(
      A2E_EMPTY_STATE_SURFACES.agenda.templateCategory,
    );
    expect(hostCategories).toContain(
      A2E_EMPTY_STATE_SURFACES.tasks.templateCategory,
    );
  });

  it('matches record objects to their contextual surface', () => {
    expect(getA2eEmptyStateSurfaceForObject('document')?.surfaceKey).toBe(
      'documents',
    );
    expect(getA2eEmptyStateSurfaceForObject('task')?.surfaceKey).toBe('tasks');
    expect(getA2eEmptyStateSurfaceForObject('invoice')?.surfaceKey).toBe(
      'bilanInvoices',
    );
    expect(getA2eEmptyStateSurfaceForObject('quote')?.surfaceKey).toBe(
      'bilanQuotes',
    );
    expect(getA2eEmptyStateSurfaceForObject('budget')?.surfaceKey).toBe(
      'bilanBudgets',
    );
    expect(
      getA2eEmptyStateSurfaceForObject('financeCategory')?.surfaceKey,
    ).toBe('bilanCategories');
    expect(getA2eEmptyStateSurfaceForObject('driveFolder')?.surfaceKey).toBe(
      'archiveFolders',
    );
    expect(getA2eEmptyStateSurfaceForObject('company')).toBeNull();
  });

  it('gates every app-owned surface on its owning app', () => {
    expect(A2E_EMPTY_STATE_SURFACES.bilanInvoices.requiredApplication).toBe(
      'accounting',
    );
    expect(A2E_EMPTY_STATE_SURFACES.archive.requiredApplication).toBe('drive');
    expect(A2E_EMPTY_STATE_SURFACES.archiveFolders.requiredApplication).toBe(
      'drive',
    );
    expect(A2E_EMPTY_STATE_SURFACES.agenda.requiredApplication).toBeNull();
  });
});
