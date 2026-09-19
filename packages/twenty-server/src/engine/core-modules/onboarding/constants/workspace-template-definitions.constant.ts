import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { type TemplatePreviewSample } from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';

// a2e-documents application (packages/twenty-apps/internal/a2e-documents).
const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

// a2e-accounting application, "Bilan"
// (packages/twenty-apps/internal/a2e-accounting) — append future app UUIDs
// here as they land.
const A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER =
  'b11a0000-0000-4000-8000-000000000001';

// Proposed starter content previewed per persona (P1.6d). Labels mirror the
// app-owned starter payload descriptors (a2e-documents starter-templates.ts,
// a2e-accounting starter-books.ts) so the setup preview can show what a persona
// seeds. These are proposals, not the seed source of truth: the rows are still
// created only by each app's post-install hook (D02 owns the final contents).
export type WorkspaceTemplateBundleContent = TemplatePreviewSample & {
  applicationUniversalIdentifier: string;
};

// Upstream gates that defer a proposed bundle item until a later phase. Recorded
// on the definition (and surfaced in the preview) so a blocked item is never
// silently dropped from a persona.
export type WorkspaceTemplateBundleBlockReason = 'P7.0_SAFETY_GATE';

export type WorkspaceTemplateBlockedBundleContent = TemplatePreviewSample & {
  applicationUniversalIdentifier: string;
  blockedBy: WorkspaceTemplateBundleBlockReason;
};

const bundleContent = (
  applicationUniversalIdentifier: string,
  label: string,
): WorkspaceTemplateBundleContent => ({
  applicationUniversalIdentifier,
  label,
  locale: 'fr',
});

const blockedBundleContent = (
  applicationUniversalIdentifier: string,
  label: string,
  blockedBy: WorkspaceTemplateBundleBlockReason,
): WorkspaceTemplateBlockedBundleContent => ({
  applicationUniversalIdentifier,
  label,
  locale: 'fr',
  blockedBy,
});

// Named items (not string-filtered) so a typo is a compile-time error and the
// persona lists cannot silently drop a proposed content item.
const DOCUMENT_BUNDLE_ITEM = {
  meetingNotes: bundleContent(
    A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Notes de réunion',
  ),
  projectBrief: bundleContent(
    A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Brief de projet',
  ),
  productRequirements: bundleContent(
    A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Spécifications produit (PRD)',
  ),
  oneOnOne: bundleContent(
    A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Entretien individuel',
  ),
} satisfies Record<string, WorkspaceTemplateBundleContent>;

// Bilan (a2e-accounting) proposed contents are deferred behind the P7.0 safety
// gate: they are recorded here as blocked upstream, never previewed as ready,
// and never included in `starterBundleContents`.
const BLOCKED_ACCOUNTING_BUNDLE_ITEM = {
  cashflow: blockedBundleContent(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Trésorerie',
    'P7.0_SAFETY_GATE',
  ),
  donations: blockedBundleContent(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Dons',
    'P7.0_SAFETY_GATE',
  ),
  grants: blockedBundleContent(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Subventions',
    'P7.0_SAFETY_GATE',
  ),
  balancedBudget: blockedBundleContent(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Budget prévisionnel à l’équilibre',
    'P7.0_SAFETY_GATE',
  ),
  grantRequest: blockedBundleContent(
    A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    'Demande de subvention',
    'P7.0_SAFETY_GATE',
  ),
} satisfies Record<string, WorkspaceTemplateBlockedBundleContent>;

export type WorkspaceTemplateDefinition = {
  // Integer bumped whenever the definition changes meaningfully (app set,
  // managed nav rows, samples); recorded in setup-operation results so a
  // client can detect stale previews (P1.6a contract §1).
  version: number;
  applicationUniversalIdentifiers: string[];
  // Apps a user may deselect at setup; every other preset app is required.
  // Empty until P1.6d marks per-app optionality.
  optionalApplicationUniversalIdentifiers: string[];
  // Standard navigation rows hidden for CRM-off presets; templates hide by
  // deleting the workspace-wide row (navigation menu items are DB rows).
  hiddenStandardNavigationMenuItemUniversalIdentifiers: string[];
  sampleContentEnabled: boolean;
  // Preview-only proposal list (never the seeding source). The preview filters
  // it to apps that are registered and version-compatible on the server.
  starterBundleContents: WorkspaceTemplateBundleContent[];
  // Proposed contents deferred behind an upstream gate. Recorded so the preview
  // can show them as blocked instead of dropping them silently.
  blockedStarterBundleContents: WorkspaceTemplateBlockedBundleContent[];
};

export const WORKSPACE_TEMPLATE_DEFINITIONS: Record<
  WorkspaceTemplate,
  WorkspaceTemplateDefinition
> = {
  [WorkspaceTemplate.CRM]: {
    version: 1,
    applicationUniversalIdentifiers: [],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
    starterBundleContents: [],
    blockedStarterBundleContents: [],
  },
  [WorkspaceTemplate.INDIVIDUAL]: {
    version: 1,
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [
      '20202020-b001-4b01-8b01-c0aba11c0001',
      '20202020-b005-4b05-8b05-c0aba11c0005',
      '20202020-b004-4b04-8b04-c0aba11c0004',
    ],
    sampleContentEnabled: false,
    starterBundleContents: [
      DOCUMENT_BUNDLE_ITEM.meetingNotes,
      DOCUMENT_BUNDLE_ITEM.oneOnOne,
    ],
    blockedStarterBundleContents: [],
  },
  [WorkspaceTemplate.STUDENT]: {
    version: 1,
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [
      '20202020-b001-4b01-8b01-c0aba11c0001',
      '20202020-b005-4b05-8b05-c0aba11c0005',
      '20202020-b004-4b04-8b04-c0aba11c0004',
    ],
    sampleContentEnabled: false,
    starterBundleContents: [
      DOCUMENT_BUNDLE_ITEM.meetingNotes,
      DOCUMENT_BUNDLE_ITEM.projectBrief,
      DOCUMENT_BUNDLE_ITEM.productRequirements,
    ],
    blockedStarterBundleContents: [],
  },
  [WorkspaceTemplate.TEAM]: {
    version: 1,
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
    starterBundleContents: [
      DOCUMENT_BUNDLE_ITEM.meetingNotes,
      DOCUMENT_BUNDLE_ITEM.projectBrief,
      DOCUMENT_BUNDLE_ITEM.productRequirements,
      DOCUMENT_BUNDLE_ITEM.oneOnOne,
    ],
    blockedStarterBundleContents: [],
  },
  [WorkspaceTemplate.NON_PROFIT]: {
    version: 1,
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
    starterBundleContents: [DOCUMENT_BUNDLE_ITEM.meetingNotes],
    blockedStarterBundleContents: [
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.donations,
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.grants,
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.balancedBudget,
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.grantRequest,
    ],
  },
  [WorkspaceTemplate.SMALL_BUSINESS]: {
    version: 1,
    applicationUniversalIdentifiers: [
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER,
    ],
    optionalApplicationUniversalIdentifiers: [],
    hiddenStandardNavigationMenuItemUniversalIdentifiers: [],
    sampleContentEnabled: false,
    starterBundleContents: [
      DOCUMENT_BUNDLE_ITEM.projectBrief,
      DOCUMENT_BUNDLE_ITEM.productRequirements,
    ],
    blockedStarterBundleContents: [
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.cashflow,
      BLOCKED_ACCOUNTING_BUNDLE_ITEM.balancedBudget,
    ],
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
