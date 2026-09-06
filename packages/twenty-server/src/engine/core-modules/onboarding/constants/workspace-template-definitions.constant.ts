import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';

// a2e-documents application (packages/twenty-apps/internal/a2e-documents) —
// the only A2E app published so far; append future app UUIDs here as they land.
const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

export type WorkspaceTemplateDefinition = {
  applicationUniversalIdentifiers: string[];
  // Standard navigation rows hidden for CRM-off presets; templates hide by
  // deleting the workspace-wide row (navigation menu items are DB rows).
  hiddenStandardNavigationMenuItemUniversalIdentifiers: string[];
  sampleContentEnabled: boolean;
};

export const WORKSPACE_TEMPLATE_DEFINITIONS: Record<
  WorkspaceTemplate,
  WorkspaceTemplateDefinition
> = {
  [WorkspaceTemplate.CRM]: {
    applicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
  },
  [WorkspaceTemplate.INDIVIDUAL]: {
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [
      '20202020-b001-4b01-8b01-c0aba11c0001',
      '20202020-b005-4b05-8b05-c0aba11c0005',
      '20202020-b004-4b04-8b04-c0aba11c0004',
    ],
    sampleContentEnabled: false,
  },
  [WorkspaceTemplate.STUDENT]: {
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [
      '20202020-b001-4b01-8b01-c0aba11c0001',
      '20202020-b005-4b05-8b05-c0aba11c0005',
      '20202020-b004-4b04-8b04-c0aba11c0004',
    ],
    sampleContentEnabled: false,
  },
  [WorkspaceTemplate.TEAM]: {
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
  },
  [WorkspaceTemplate.NON_PROFIT]: {
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
  },
  [WorkspaceTemplate.SMALL_BUSINESS]: {
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
  },
};

// Union of every standard navigation row any template can hide — templates
// may only toggle visibility for rows in this set, everything else is
// user-owned and never touched.
export const TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS =
  [
    ...new Set(
      Object.values(WORKSPACE_TEMPLATE_DEFINITIONS).flatMap(
        (definition) =>
          definition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
      ),
    ),
  ];
