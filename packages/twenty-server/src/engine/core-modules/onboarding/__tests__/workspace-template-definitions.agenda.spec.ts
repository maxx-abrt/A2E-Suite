import {
  TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  WORKSPACE_TEMPLATE_DEFINITIONS,
  getHiddenStandardNavigationMenuItemUniversalIdentifiers,
  type WorkspaceTemplateDefinition,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-navigation-menu-item.constant';

const CRM_HIDDEN_ROW_UNIVERSAL_IDENTIFIER =
  '20202020-b001-4b01-8b01-c0aba11c0001';

const buildDefinition = ({
  agendaEnabled,
}: {
  agendaEnabled: boolean;
}): WorkspaceTemplateDefinition => ({
  version: 1,
  applicationUniversalIdentifiers: [],
  optionalApplicationUniversalIdentifiers: [],
  hiddenStandardNavigationMenuItemUniversalIdentifiers: [
    CRM_HIDDEN_ROW_UNIVERSAL_IDENTIFIER,
  ],
  agendaEnabled,
  sampleContentEnabled: false,
  starterBundleContents: [],
  blockedStarterBundleContents: [],
});

describe('workspace template agenda flag', () => {
  it('declares a boolean agendaEnabled on every preset', () => {
    for (const definition of Object.values(WORKSPACE_TEMPLATE_DEFINITIONS)) {
      expect(typeof definition.agendaEnabled).toBe('boolean');
    }
  });

  it('keeps the Agenda standard row while the preset enables it', () => {
    expect(
      getHiddenStandardNavigationMenuItemUniversalIdentifiers(
        buildDefinition({ agendaEnabled: true }),
      ),
    ).toEqual([CRM_HIDDEN_ROW_UNIVERSAL_IDENTIFIER]);
  });

  it('adds the Agenda standard row to the hide-list when the preset opts out', () => {
    expect(
      getHiddenStandardNavigationMenuItemUniversalIdentifiers(
        buildDefinition({ agendaEnabled: false }),
      ),
    ).toEqual([
      CRM_HIDDEN_ROW_UNIVERSAL_IDENTIFIER,
      AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
    ]);
  });

  it('marks the Agenda row template-managed when a preset can hide it', () => {
    // The managed set is the union of every template's effective hide-list, so
    // it only carries the Agenda row once a preset opts out — with every preset
    // enabling Agenda the row is user-owned and never touched.
    const effectiveHideLists = Object.values(
      WORKSPACE_TEMPLATE_DEFINITIONS,
    ).map(getHiddenStandardNavigationMenuItemUniversalIdentifiers);
    const anyPresetHidesAgenda = effectiveHideLists.some((hideList) =>
      hideList.includes(AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER),
    );

    expect(
      TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.includes(
        AGENDA_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
      ),
    ).toBe(anyPresetHidesAgenda);
  });

  it('ships Agenda enabled in every current preset', () => {
    for (const definition of Object.values(WORKSPACE_TEMPLATE_DEFINITIONS)) {
      expect(definition.agendaEnabled).toBe(true);
    }
  });
});
