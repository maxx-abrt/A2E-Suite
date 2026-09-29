import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';
import { CHAT_DISCUSSIONS_PATH } from '../lib/chat-navigation.ts';

// The row opens the native /discussions page in-app now that host LINK nav
// items accept allow-listed internal routes (US-101/D09); it used to pin the
// allChannels view record index. Position 130 keeps A2E Chat after Documents
// (100) and Projects (110/120) in the workspace nav; users can reorder/hide it
// like any native item.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.channels,
  name: 'Discussions',
  icon: 'IconMessages',
  position: 130,
  type: NavigationMenuItemType.LINK,
  link: CHAT_DISCUSSIONS_PATH,
});
