import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';
import { DRIVE_APP_PATH } from '../lib/drive-file-search.ts';

// The row opens the native /drive explorer page in-app now that host LINK nav
// items accept allow-listed internal routes (US-101/D09); it used to pin the
// allDriveFolders view record index. It nests under the app's own "Archive"
// folder (M7c Archive leg) so the sidebar reads as one group; managed rows only,
// user-created rows are never reparented. Position 0 puts it first in the group.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.drive,
  name: 'Files',
  icon: 'IconFolder',
  position: 0,
  type: NavigationMenuItemType.LINK,
  link: DRIVE_APP_PATH,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.archiveFolder,
});
