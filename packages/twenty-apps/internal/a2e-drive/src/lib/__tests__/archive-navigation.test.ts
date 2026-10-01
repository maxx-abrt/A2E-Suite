import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NavigationMenuItemType } from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../../constants/universal-identifiers.ts';
import { DRIVE_APP_PATH } from '../drive-file-search.ts';

// M7c Archive leg: a2e-drive owns one FOLDER nav item and nests its own "Files"
// row inside it, so the sidebar reads as a single collapsible Archive group.
// a2e-drive owns both sides, so the group resolves on a standalone install —
// unlike the Bureau folder, which a sibling app owns. The live install stays
// Tier 2.

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name: string;
  type: NavigationMenuItemType;
  position: number;
  link?: string;
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

test('a2e-drive owns the Archive folder and nests its Files row inside it', async () => {
  const folder = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/archive-folder.navigation-menu-item.ts',
  );

  assert.equal(
    folder.universalIdentifier,
    NAVIGATION_MENU_ITEM_IDS.archiveFolder,
  );
  assert.equal(folder.type, NavigationMenuItemType.FOLDER);
  assert.equal(folder.name, 'Archive');
  assert.equal(folder.folderUniversalIdentifier, undefined);

  const files = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/drive.navigation-menu-item.ts',
  );

  assert.equal(files.universalIdentifier, NAVIGATION_MENU_ITEM_IDS.drive);
  assert.equal(files.type, NavigationMenuItemType.LINK);
  assert.equal(files.link, DRIVE_APP_PATH);
  assert.equal(
    files.folderUniversalIdentifier,
    NAVIGATION_MENU_ITEM_IDS.archiveFolder,
  );
});
