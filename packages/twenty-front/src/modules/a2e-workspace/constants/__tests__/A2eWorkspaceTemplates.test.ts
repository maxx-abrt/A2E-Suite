import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { type MessageDescriptor } from '@lingui/core';

import { A2E_WORKSPACE_TEMPLATE_OPTIONS } from '@/a2e-workspace/constants/A2eWorkspaceTemplates';
import { ONBOARDING_INSTALLABLE_APPS } from '@/onboarding/constants/OnboardingInstallableApps';

// Truthfulness guard for the workspace-template picker copy (M2 f / G4,
// US-090). The descriptions used to promise things presets do not do
// ("courses and projects" without the Projects app, "members, volunteers and
// grants" with no such content, Small business silent about Bilan). The spec
// reads the server's real WORKSPACE_TEMPLATE_DEFINITIONS and checks each
// description against what the preset installs and hides, using the product
// names of the onboarding app list.

const findRepositoryRoot = (): string => {
  let directory = process.cwd();

  while (!existsSync(join(directory, 'packages', 'twenty-server'))) {
    const parentDirectory = dirname(directory);

    if (parentDirectory === directory) {
      throw new Error('Repository root with packages/twenty-server not found');
    }

    directory = parentDirectory;
  }

  return directory;
};

type ServerTemplateDefinition = {
  template: string;
  applicationUniversalIdentifiers: string[];
  hidesCrmNavigation: boolean;
};

const readServerTemplateDefinitions = (): ServerTemplateDefinition[] => {
  const source = readFileSync(
    join(
      findRepositoryRoot(),
      'packages',
      'twenty-server',
      'src',
      'engine',
      'core-modules',
      'onboarding',
      'constants',
      'workspace-template-definitions.constant.ts',
    ),
    'utf8',
  );

  const universalIdentifierByConstantName = new Map(
    [...source.matchAll(/const (\w+) =\s*'([0-9a-f-]{36})'/g)].map(
      (match) => [match[1], match[2]] as const,
    ),
  );

  const definitionsSource = source.slice(
    source.indexOf('export const WORKSPACE_TEMPLATE_DEFINITIONS'),
  );

  return [
    ...definitionsSource.matchAll(
      /\[WorkspaceTemplate\.(\w+)\]:\s*\{([\s\S]*?)\n {2}\},/g,
    ),
  ].map(([, template, body]) => {
    const applicationList =
      body.match(/applicationUniversalIdentifiers:\s*\[([\s\S]*?)\]/)?.[1] ??
      '';
    const hiddenNavigationList =
      body.match(
        /hiddenStandardNavigationMenuItemUniversalIdentifiers:\s*\[([\s\S]*?)\]/,
      )?.[1] ?? '';

    return {
      template,
      applicationUniversalIdentifiers: (
        applicationList.match(/\w+/g) ?? []
      ).map((constantName) => {
        const universalIdentifier =
          universalIdentifierByConstantName.get(constantName);

        if (universalIdentifier === undefined) {
          throw new Error(`Unknown application constant ${constantName}`);
        }

        return universalIdentifier;
      }),
      hidesCrmNavigation: /'[0-9a-f-]{36}'/.test(hiddenNavigationList),
    };
  });
};

const readMessage = (descriptor: MessageDescriptor): string =>
  descriptor.message ?? descriptor.id;

const serverDefinitions = readServerTemplateDefinitions();

// First-party app product names as the onboarding app list shows them.
const A2E_PRODUCT_NAMES = new Map(
  [
    '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
    '4f759655-84f8-434d-9c76-ee1850e8c1a4',
    'b11a0000-0000-4000-8000-000000000001',
    'e2dce399-87f1-4548-b307-5f368b4d5dd4',
    'b11cd01f-75de-4acd-8e67-0e9c484fde02',
  ].map((universalIdentifier) => {
    const app = ONBOARDING_INSTALLABLE_APPS.find(
      (onboardingApp) =>
        onboardingApp.universalIdentifier === universalIdentifier,
    );

    if (app === undefined) {
      throw new Error(`${universalIdentifier} missing from onboarding apps`);
    }

    return [universalIdentifier, readMessage(app.label)] as const;
  }),
);

describe('A2E_WORKSPACE_TEMPLATE_OPTIONS copy', () => {
  it('reads one server definition per picker option', () => {
    expect(
      serverDefinitions.map((definition) => definition.template).sort(),
    ).toEqual(
      A2E_WORKSPACE_TEMPLATE_OPTIONS.map((option) => option.value).sort(),
    );
  });

  it.each(
    A2E_WORKSPACE_TEMPLATE_OPTIONS.map((option) => [option.value, option]),
  )('%s names exactly the A2E products it installs', (_template, option) => {
    const definition = serverDefinitions.find(
      (serverDefinition) => serverDefinition.template === option.value,
    );
    const description = readMessage(option.description);

    expect(definition).toBeDefined();

    for (const [universalIdentifier, productName] of A2E_PRODUCT_NAMES) {
      const isInstalled =
        definition?.applicationUniversalIdentifiers.includes(
          universalIdentifier,
        ) ?? false;

      const isNamed = new RegExp(`\\b${productName}\\b`, 'i').test(description);

      expect({ productName, isNamed }).toEqual({
        productName,
        isNamed: isInstalled,
      });
    }
  });

  it.each(
    A2E_WORKSPACE_TEMPLATE_OPTIONS.map((option) => [option.value, option]),
  )('%s says whether the CRM stays', (_template, option) => {
    const definition = serverDefinitions.find(
      (serverDefinition) => serverDefinition.template === option.value,
    );
    const description = readMessage(option.description);

    if (definition?.hidesCrmNavigation === true) {
      expect(description).toContain('CRM navigation hidden');

      return;
    }

    expect(description).not.toContain('hidden');

    // Presets that add apps on top of the CRM must say the CRM stays; the
    // CRM preset itself is the baseline.
    if ((definition?.applicationUniversalIdentifiers.length ?? 0) > 0) {
      expect(description).toContain('CRM');
    }
  });
});
