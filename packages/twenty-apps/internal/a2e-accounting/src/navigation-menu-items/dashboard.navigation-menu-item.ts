import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  PAGE_LAYOUT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.dashboard,
  name: 'Tableau de bord',
  icon: 'IconLayoutDashboard',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.folder,
  pageLayoutUniversalIdentifier: PAGE_LAYOUT_IDS.dashboard,
});
