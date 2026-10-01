import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
} from '../constants/universal-identifiers.ts';
import { CHAT_DISCUSSIONS_PATH } from '../lib/chat-navigation.ts';

// The row opens the native /discussions page in-app now that host LINK nav
// items accept allow-listed internal routes (US-101/D09); it used to pin the
// allChannels view record index. It nests under the shared "Bureau" folder
// owned by A2E Documents (M7c), after Pages (0) and Projets (1), so the
// sidebar shows one collapsible Bureau group. Managed rows only: the folder is
// a hard install prerequisite, and user-created rows are never reparented.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.channels,
  name: 'Discussions',
  icon: 'IconMessages',
  position: 2,
  type: NavigationMenuItemType.LINK,
  link: CHAT_DISCUSSIONS_PATH,
  folderUniversalIdentifier:
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
});
