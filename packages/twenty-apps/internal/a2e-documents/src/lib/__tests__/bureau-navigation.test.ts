import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NavigationMenuItemType } from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../../constants/universal-identifiers.ts';

// The Bureau suite root (a2e-documents) owns one FOLDER nav item; its own
// "Pages" row nests inside it (M7c). The sibling Bureau apps point their rows
// at the same committed folder identifier, so the whole suite reads as one
// collapsible sidebar entry (the live install stays Tier 2).

type NavigationMenuItemDefinition = {
  universalIdentifier: string;
  name: string;
  type: NavigationMenuItemType;
  position: number;
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

test('a2e-documents owns the Bureau folder and nests its Pages row inside it', async () => {
  const folder = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/bureau-folder.navigation-menu-item.ts',
  );

  assert.equal(folder.universalIdentifier, NAVIGATION_MENU_ITEM_IDS.bureauFolder);
  assert.equal(folder.type, NavigationMenuItemType.FOLDER);
  assert.equal(folder.name, 'Bureau');
  assert.equal(folder.folderUniversalIdentifier, undefined);

  const pages = await unwrap<NavigationMenuItemDefinition>(
    '../../navigation-menu-items/documents.navigation-menu-item.ts',
  );

  assert.equal(pages.universalIdentifier, NAVIGATION_MENU_ITEM_IDS.documents);
  assert.equal(pages.type, NavigationMenuItemType.VIEW);
  assert.equal(pages.name, 'Pages');
  assert.equal(
    pages.folderUniversalIdentifier,
    NAVIGATION_MENU_ITEM_IDS.bureauFolder,
  );
  assert.equal(pages.viewUniversalIdentifier, VIEW_IDS.allDocuments);
});
