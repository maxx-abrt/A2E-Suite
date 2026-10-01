import {
  A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS,
  WORKSPACE_TEMPLATE_DEFINITIONS,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';

// M7e/D-B1 option (a): "Bureau" is a preset bundle, not a distinct app. The
// bundle is documents + projects + chat in install order. These are the
// committed universal identifiers from packages/twenty-apps/internal/a2e-*.
const A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';
const A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER =
  '4f759655-84f8-434d-9c76-ee1850e8c1a4';
const A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER =
  'e2dce399-87f1-4548-b307-5f368b4d5dd4';

const BUREAU_BUNDLE_PERSONAS = [
  WorkspaceTemplate.INDIVIDUAL,
  WorkspaceTemplate.STUDENT,
  WorkspaceTemplate.TEAM,
  WorkspaceTemplate.NON_PROFIT,
  WorkspaceTemplate.SMALL_BUSINESS,
];

describe('Bureau bundle definition (D-B1 option a)', () => {
  it('resolves to the three Bureau apps in install order', () => {
    expect(A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS).toEqual([
      A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      A2E_PROJECTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      A2E_CHAT_APPLICATION_UNIVERSAL_IDENTIFIER,
    ]);
  });

  it('has no duplicate app identifiers', () => {
    expect(
      new Set(A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS).size,
    ).toBe(A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS.length);
  });

  it.each(BUREAU_BUNDLE_PERSONAS)(
    '%s installs the full bundle, in order, never a partial set',
    (persona) => {
      const appUniversalIdentifiers =
        WORKSPACE_TEMPLATE_DEFINITIONS[persona]
          .applicationUniversalIdentifiers;

      for (const bundleAppUniversalIdentifier of A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS) {
        expect(appUniversalIdentifiers).toContain(
          bundleAppUniversalIdentifier,
        );
      }

      // Documents is the Bureau folder owner and the `document` relation
      // target, so it must install before the rows that nest under it.
      const installedBundleOrder =
        A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS.map(
          (bundleAppUniversalIdentifier) =>
            appUniversalIdentifiers.indexOf(bundleAppUniversalIdentifier),
        );

      expect(installedBundleOrder).toEqual(
        [...installedBundleOrder].sort((first, second) => first - second),
      );
    },
  );

  it('leaves the CRM-only preset without any Bureau app', () => {
    for (const bundleAppUniversalIdentifier of A2E_BUREAU_BUNDLE_APPLICATION_UNIVERSAL_IDENTIFIERS) {
      expect(
        WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.CRM]
          .applicationUniversalIdentifiers,
      ).not.toContain(bundleAppUniversalIdentifier);
    }
  });

  it('keeps the ready document bundle items referencing their gallery keys', () => {
    const documentTemplateKeys = [
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.INDIVIDUAL]
        .starterBundleContents,
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.STUDENT]
        .starterBundleContents,
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.TEAM]
        .starterBundleContents,
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.NON_PROFIT]
        .starterBundleContents,
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.SMALL_BUSINESS]
        .starterBundleContents,
    ]
      .filter(
        (bundleContent) =>
          bundleContent.applicationUniversalIdentifier ===
          A2E_DOCUMENTS_APPLICATION_UNIVERSAL_IDENTIFIER,
      )
      .map((bundleContent) => bundleContent.templateKey);

    expect(documentTemplateKeys.length).toBeGreaterThan(0);
    expect(
      documentTemplateKeys.every(
        (templateKey) =>
          typeof templateKey === 'string' && templateKey.length > 0,
      ),
    ).toBe(true);
  });

  it('keeps the blocked Bilan items carrying their template keys', () => {
    const blockedTemplateKeys = [
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.NON_PROFIT]
        .blockedStarterBundleContents,
      ...WORKSPACE_TEMPLATE_DEFINITIONS[WorkspaceTemplate.SMALL_BUSINESS]
        .blockedStarterBundleContents,
    ]
      .map((blockedContent) => blockedContent.templateKey)
      .filter((templateKey): templateKey is string => templateKey !== undefined);

    expect(blockedTemplateKeys).toEqual(
      expect.arrayContaining(['BUDGET_EQUILIBRE', 'DEMANDE_SUBVENTION']),
    );
  });
});
