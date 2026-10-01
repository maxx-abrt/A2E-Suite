import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NavigationMenuItemType } from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
} from '../../constants/universal-identifiers.ts';
import { CHAT_DISCUSSIONS_PATH } from '../chat-navigation.ts';

// The P5.2 reachability follow-up: the a2e-chat "go to chat" command (and the
// nav entry) must land on the dedicated chat page at /discussions with its
// channel sidebar, not on the chatChannels record index it used to open.
test('the discussions path matches AppPath.Discussions', () => {
  assert.equal(CHAT_DISCUSSIONS_PATH, '/discussions');
});

test('the go-to-chat command no longer targets the chatChannels record index', () => {
  assert.notEqual(CHAT_DISCUSSIONS_PATH, '/objects/chatChannels');
});

// M7c: the "Discussions" row nests under the shared "Bureau" folder owned by
// A2E Documents, after Pages (0) and Projets (1), so the sidebar shows one
// Bureau group. Documents is a hard install prerequisite (transitively through
// A2E Projects' `project` object), so the folder resolves at install time.
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

test('the Discussions row nests under the shared Bureau folder', async () => {
  const module = (await import(
    '../../navigation-menu-items/channels.navigation-menu-item.ts'
  )) as { default: DefinitionResult<NavigationMenuItemDefinition> };

  assert.equal(module.default.success, true);

  const discussions = module.default.config;

  assert.equal(
    discussions.universalIdentifier,
    NAVIGATION_MENU_ITEM_IDS.channels,
  );
  assert.equal(discussions.type, NavigationMenuItemType.LINK);
  assert.equal(discussions.link, CHAT_DISCUSSIONS_PATH);
  assert.equal(
    discussions.folderUniversalIdentifier,
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
  );
  assert.equal(discussions.position, 2);
});
