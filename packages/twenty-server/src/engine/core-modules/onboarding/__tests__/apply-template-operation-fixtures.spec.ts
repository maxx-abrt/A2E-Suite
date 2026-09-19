import { isDefined } from 'twenty-shared/utils';

import {
  individualTemplateApplyResult,
  individualTemplatePreview,
  templateRejectionFixtures,
  type TemplateContentRejectionCode,
  type TemplateContractRejectionCode,
  type TemplateRejectionStage,
} from 'src/engine/core-modules/onboarding/__tests__/fixtures/apply-template-operation.fixtures';
import { ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS } from 'src/engine/core-modules/onboarding/constants/onboarding-installable-app-universal-identifiers';
import {
  TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  WORKSPACE_TEMPLATE_DEFINITIONS,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';
import { OnboardingExceptionCode } from 'src/engine/core-modules/onboarding/onboarding.exception';
import { type OperationStepErrorCode } from 'src/engine/core-modules/onboarding/types/apply-template-operation.types';

const KNOWN_OPERATION_STEP_ERROR_CODES: OperationStepErrorCode[] = [
  'APP_NOT_REGISTERED',
  'VERSION_INCOMPATIBLE',
  'INSTALL_FAILED',
  'NAVIGATION_FAILED',
  'SEED_FAILED',
];

const KNOWN_ONBOARDING_EXCEPTION_CODES = Object.values(OnboardingExceptionCode);

const KNOWN_CONTENT_REJECTION_CODES: TemplateContentRejectionCode[] = [
  'TEMPLATE_CONTENT_CROSS_WORKSPACE',
  'TEMPLATE_CONTENT_CYCLE',
];

const KNOWN_REJECTION_STAGES: TemplateRejectionStage[] = [
  'pre-step',
  'step-failure',
  'idempotent-replay',
  'descriptor-load',
];

const KNOWN_REJECTION_CODES: TemplateContractRejectionCode[] = [
  ...KNOWN_OPERATION_STEP_ERROR_CODES,
  ...KNOWN_ONBOARDING_EXCEPTION_CODES,
  ...KNOWN_CONTENT_REJECTION_CODES,
];

const collectKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }

  if (isDefined(value) && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, child]) => [key, ...collectKeys(child)],
    );
  }

  return [];
};

const collectStringValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (isDefined(value) && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectStringValues,
    );
  }

  return [];
};

const ALL_FIXTURE_VALUES = [
  individualTemplatePreview,
  individualTemplateApplyResult,
  templateRejectionFixtures,
  // The persona bundle data is repeat-safe by construction too: labels, locale,
  // app universal identifiers and a gate key — never a record ID, token, share
  // URL or live finance row.
  Object.values(WORKSPACE_TEMPLATE_DEFINITIONS).flatMap((definition) => [
    ...definition.starterBundleContents,
    ...definition.blockedStarterBundleContents,
  ]),
];

describe('apply-template-operation fixtures', () => {
  it('conforms every fixture to its contract shape', () => {
    expect(typeof individualTemplatePreview.templateKey).toBe('string');
    expect(Number.isInteger(individualTemplatePreview.version)).toBe(true);
    expect(typeof individualTemplatePreview.blocked).toBe('boolean');

    for (const sample of individualTemplatePreview.samples) {
      expect(typeof sample.label).toBe('string');
      expect(sample.label.length).toBeGreaterThan(0);
      expect(typeof sample.locale).toBe('string');
    }

    for (const blockedSample of individualTemplatePreview.blockedSamples) {
      expect(typeof blockedSample.label).toBe('string');
      expect(blockedSample.label.length).toBeGreaterThan(0);
      expect(typeof blockedSample.locale).toBe('string');
      expect(typeof blockedSample.blockedBy).toBe('string');
    }

    for (const app of individualTemplatePreview.apps) {
      expect(typeof app.universalIdentifier).toBe('string');
      expect(typeof app.displayName).toBe('string');
      expect(typeof app.registered).toBe('boolean');
      expect(typeof app.versionCompatible).toBe('boolean');
      expect(typeof app.required).toBe('boolean');
      expect(typeof app.currentlyInstalled).toBe('boolean');
    }

    for (const navigationChange of individualTemplatePreview.navigationChanges) {
      expect(typeof navigationChange.universalIdentifier).toBe('string');
      expect(['hide', 'restore']).toContain(navigationChange.action);
    }

    expect(typeof individualTemplateApplyResult.operationId).toBe('string');
    expect(individualTemplateApplyResult.steps.length).toBeGreaterThan(0);

    for (const step of individualTemplateApplyResult.steps) {
      expect([
        'install-app',
        'navigation-visibility',
        'seed-samples',
        'set-workspace-template',
      ]).toContain(step.kind);
      expect([
        'pending',
        'running',
        'succeeded',
        'failed',
        'skipped',
      ]).toContain(step.status);
      if (isDefined(step.errorCode)) {
        expect(KNOWN_OPERATION_STEP_ERROR_CODES).toContain(step.errorCode);
      }
    }

    for (const fixture of templateRejectionFixtures) {
      expect(KNOWN_REJECTION_STAGES).toContain(fixture.stage);
      for (const code of fixture.expectedCodes) {
        expect(KNOWN_REJECTION_CODES).toContain(code);
      }
    }
  });

  it('covers the §7 preview, result and one fixture per rejection-matrix row', () => {
    expect(templateRejectionFixtures).toHaveLength(9);

    const matrixRows = templateRejectionFixtures.map(
      (fixture) => fixture.matrixRow,
    );

    expect(new Set(matrixRows).size).toBe(matrixRows.length);

    const expectedCodes = templateRejectionFixtures.flatMap(
      (fixture) => fixture.expectedCodes,
    );

    expect(expectedCodes).toEqual(
      expect.arrayContaining([
        OnboardingExceptionCode.TEMPLATE_UNKNOWN,
        OnboardingExceptionCode.TEMPLATE_VERSION_CONFLICT,
        OnboardingExceptionCode.TEMPLATE_APP_NOT_IN_DEFINITION,
        OnboardingExceptionCode.TEMPLATE_REQUIRED_APP_DESELECTED,
        'APP_NOT_REGISTERED',
        'VERSION_INCOMPATIBLE',
        OnboardingExceptionCode.TEMPLATE_IDEMPOTENCY_CONFLICT,
        'TEMPLATE_CONTENT_CROSS_WORKSPACE',
        'TEMPLATE_CONTENT_CYCLE',
      ]),
    );

    const idempotentReplay = templateRejectionFixtures.find(
      (fixture) => fixture.stage === 'idempotent-replay',
    );

    expect(idempotentReplay?.expectedCodes).toEqual([]);
  });

  it('matches the individual preview to its template definition and managed nav rows', () => {
    const individualDefinition =
      WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.INDIVIDUAL];

    expect(individualTemplatePreview.templateKey).toBe(
      WorkspaceTemplate.INDIVIDUAL,
    );
    expect(individualTemplatePreview.version).toBe(
      individualDefinition.version,
    );
    expect(
      individualTemplatePreview.apps.map((app) => app.universalIdentifier),
    ).toEqual(individualDefinition.applicationUniversalIdentifiers);
    expect(
      individualTemplatePreview.navigationChanges.map(
        (change) => change.universalIdentifier,
      ),
    ).toEqual(
      individualDefinition.hiddenStandardNavigationMenuItemUniversalIdentifiers,
    );

    for (const navigationUniversalIdentifier of individualDefinition.hiddenStandardNavigationMenuItemUniversalIdentifiers) {
      expect(
        TEMPLATE_MANAGED_STANDARD_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
      ).toContain(navigationUniversalIdentifier);
    }

    for (const app of individualTemplatePreview.apps) {
      expect(app.required).toBe(
        !individualDefinition.optionalApplicationUniversalIdentifiers.includes(
          app.universalIdentifier,
        ),
      );
    }

    // The fixture previews the persona's proposed bundle for its ready apps
    // (A2E Documents), so the sample labels are the definition's proposals.
    expect(individualTemplatePreview.samples).toEqual(
      individualDefinition.starterBundleContents.map((bundleContent) => ({
        label: bundleContent.label,
        locale: bundleContent.locale,
      })),
    );
    expect(individualTemplatePreview.blockedSamples).toEqual(
      individualDefinition.blockedStarterBundleContents.map(
        (blockedContent) => ({
          label: blockedContent.label,
          locale: blockedContent.locale,
          blockedBy: blockedContent.blockedBy,
        }),
      ),
    );
  });

  it('proposes persona bundle contents only from apps each preset installs', () => {
    for (const definition of Object.values(WORKSPACE_TEMPLATE_DEFINITIONS)) {
      const presetAppUniversalIdentifiers = new Set(
        definition.applicationUniversalIdentifiers,
      );

      for (const bundleContent of definition.starterBundleContents) {
        // "Only compatible ready apps": a persona can never preview content
        // for an app it does not install, or for one outside the suite.
        expect(presetAppUniversalIdentifiers).toContain(
          bundleContent.applicationUniversalIdentifier,
        );
        expect(bundleContent.label.length).toBeGreaterThan(0);
        expect(bundleContent.locale.length).toBeGreaterThan(0);
      }
    }

    // CRM-only stays available with no proposed contents.
    expect(
      WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.CRM]
        .starterBundleContents,
    ).toEqual([]);
    expect(
      WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.CRM]
        .blockedStarterBundleContents,
    ).toEqual([]);

    // Every non-CRM persona previews at least one proposed bundle item.
    for (const persona of [
      WorkspaceTemplate.INDIVIDUAL,
      WorkspaceTemplate.STUDENT,
      WorkspaceTemplate.TEAM,
      WorkspaceTemplate.NON_PROFIT,
      WorkspaceTemplate.SMALL_BUSINESS,
    ]) {
      expect(
        WORKSPACE_TEMPLATE_DEFINITIONS[persona].starterBundleContents.length,
      ).toBeGreaterThan(0);
    }
  });

  it('excludes Bilan (blocked upstream) from ready contents and records the P7.0 gate', () => {
    const accountingUniversalIdentifier =
      'b11a0000-0000-4000-8000-000000000001';

    for (const definition of Object.values(WORKSPACE_TEMPLATE_DEFINITIONS)) {
      const presetAppUniversalIdentifiers = new Set(
        definition.applicationUniversalIdentifiers,
      );

      // Bilan is never a ready (previewed) content source.
      expect(
        definition.starterBundleContents.map(
          (bundleContent) => bundleContent.applicationUniversalIdentifier,
        ),
      ).not.toContain(accountingUniversalIdentifier);

      for (const blockedContent of definition.blockedStarterBundleContents) {
        // Blocked content still belongs to an app the preset installs, and is
        // recorded with its upstream gate — never silently dropped.
        expect(presetAppUniversalIdentifiers).toContain(
          blockedContent.applicationUniversalIdentifier,
        );
        expect(blockedContent.blockedBy).toBe('P7.0_SAFETY_GATE');
        expect(blockedContent.label.length).toBeGreaterThan(0);
      }
    }

    // The two Bilan-installing personas record their deferred Bilan contents.
    for (const persona of [
      WorkspaceTemplate.NON_PROFIT,
      WorkspaceTemplate.SMALL_BUSINESS,
    ]) {
      const blockedContent =
        WORKSPACE_TEMPLATE_DEFINITIONS[persona].blockedStarterBundleContents;

      expect(blockedContent.length).toBeGreaterThan(0);
      expect(
        blockedContent.every(
          (content) =>
            content.applicationUniversalIdentifier ===
            accountingUniversalIdentifier,
        ),
      ).toBe(true);
    }
  });

  it('uses only identifiers known to onboarding or the template definitions', () => {
    const knownAppUniversalIdentifiers = new Set([
      ...ONBOARDING_INSTALLABLE_APP_UNIVERSAL_IDENTIFIERS,
      ...Object.values(WORKSPACE_TEMPLATE_DEFINITIONS).flatMap(
        (definition) => definition.applicationUniversalIdentifiers,
      ),
    ]);

    expect(knownAppUniversalIdentifiers.size).toBeGreaterThan(0);

    for (const app of individualTemplatePreview.apps) {
      expect(knownAppUniversalIdentifiers).toContain(app.universalIdentifier);
    }
  });

  it('models the cross-workspace and cycle rows symbolically, not with record IDs', () => {
    const crossWorkspace = templateRejectionFixtures.find((fixture) =>
      fixture.expectedCodes.includes('TEMPLATE_CONTENT_CROSS_WORKSPACE'),
    );
    const cycle = templateRejectionFixtures.find((fixture) =>
      fixture.expectedCodes.includes('TEMPLATE_CONTENT_CYCLE'),
    );

    expect(crossWorkspace?.contentDescriptor).toMatchObject({
      referenceKind: 'workspace-record',
    });
    expect(crossWorkspace?.request).toBeUndefined();
    expect(cycle?.contentDescriptor?.referenceKind).toBe(
      'universal-identifier',
    );
    expect(cycle?.contentDescriptor?.references.length).toBeGreaterThan(1);
  });

  it('keeps the P1.6e content codes outside the step and onboarding enums', () => {
    for (const code of KNOWN_CONTENT_REJECTION_CODES) {
      expect(KNOWN_OPERATION_STEP_ERROR_CODES).not.toContain(code);
      expect(KNOWN_ONBOARDING_EXCEPTION_CODES).not.toContain(code);
    }
  });

  it('records no workspace IDs, user IDs, share URLs, tokens or finance rows', () => {
    const forbiddenKeys = [
      'recordid',
      'userid',
      'workspaceid',
      'shareurl',
      'token',
      'accesstoken',
      'refreshtoken',
    ];
    const fixtureKeys = collectKeys(ALL_FIXTURE_VALUES).map((key) =>
      key.toLowerCase(),
    );

    for (const forbiddenKey of forbiddenKeys) {
      expect(fixtureKeys).not.toContain(forbiddenKey);
    }

    const fixtureStrings = collectStringValues(ALL_FIXTURE_VALUES);

    expect(fixtureStrings.some((value) => /^https?:\/\//i.test(value))).toBe(
      false,
    );
  });
});
