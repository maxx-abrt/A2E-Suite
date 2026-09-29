import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Bureau's pages row, nested under the shared "Bureau" folder (M7c) so the
// suite reads as one group. The row is named "Pages" to distinguish the folder
// identity (Bureau) from the page tree it opens.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.documents,
  name: 'Pages',
  icon: 'IconNotes',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.bureauFolder,
  viewUniversalIdentifier: VIEW_IDS.allDocuments,
});
