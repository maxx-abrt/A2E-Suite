import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';
import { DRIVE_APP_PATH } from '../lib/drive-file-search.ts';

// The row opens the native /drive explorer page in-app now that host LINK nav
// items accept allow-listed internal routes (US-101/D09); it used to pin the
// allDriveFolders view record index. Position 140 keeps A2E Drive after
// Documents (100), Projects (110/120) and Chat (130) in the workspace nav;
// users can reorder/hide it like any native item.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.drive,
  name: 'Archive',
  icon: 'IconFolder',
  position: 140,
  type: NavigationMenuItemType.LINK,
  link: DRIVE_APP_PATH,
});
