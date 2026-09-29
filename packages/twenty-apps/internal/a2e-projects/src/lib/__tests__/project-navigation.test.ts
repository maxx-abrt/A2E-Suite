import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NavigationMenuItemType } from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';

// The "Projets" row nests under the shared "Bureau" folder owned by A2E
// Documents (M7c). Documents is a hard install prerequisite, so the folder is
// present at install time.

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name: string;
  type: NavigationMenuItemType;
  viewUniversalIdentifier?: string;
  folderUniversalIdentifier?: string;
};

type DefinitionResult<TDefinition> = {
  success: boolean;
  config: TDefinition;
  errors?: unknown[];
};

const unwrap = async <TDefinition>(
  modulePath: string,
): Promise<TDefinition> => {
  const module = (await import(modulePath)) as {
    default: DefinitionResult<TDefinition>;
  };

  assert.equal(
    module.default.success,
    true,
    `invalid definition: ${modulePath}`,
  );

  return module.default.config;
};

test('the Projets row nests under the shared Bureau folder', async () => {
  const projects = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/projects.navigation-menu-item.ts',
  );

  assert.equal(projects.universalIdentifier, NAVIGATION_MENU_ITEM_IDS.projects);
  assert.equal(projects.type, NavigationMenuItemType.VIEW);
  assert.equal(
    projects.folderUniversalIdentifier,
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
  );
  assert.equal(projects.viewUniversalIdentifier, VIEW_IDS.allProjects);
});
