import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';

// Bureau's home row, nested under the shared "Bureau" folder (M7c) so the suite
// reads as one group. It opens the host Bureau landing (`/bureau`, M7f) rather
// than the flat pages table: the landing has the primary "New page" action,
// the starter templates and the recent pages, and links on to the full table —
// so the app has a home instead of dropping the user into a bare view.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.documents,
  name: 'Pages',
  icon: 'IconNotes',
  position: 0,
  type: NavigationMenuItemType.LINK,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.bureauFolder,
  link: '/bureau',
});
