import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';

// One folder holds the Archive suite, so the sidebar shows a single collapsible
// "Archive" entry instead of a loose row per app feature (M7c Archive leg,
// completing the drive half now that M7f rows exist). a2e-drive owns both the
// folder and the rows that nest under it, so the group resolves on a standalone
// install. Position 140 keeps Archive after the Bureau group (100) and its rows
// (0/1/2) in the workspace nav; users can reorder/hide it like any native item.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.archiveFolder,
  name: 'Archive',
  icon: 'IconArchive',
  position: 140,
  type: NavigationMenuItemType.FOLDER,
});
