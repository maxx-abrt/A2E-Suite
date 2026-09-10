import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.categories,
  name: 'Catégories',
  icon: 'IconCategory',
  position: 10,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.folder,
  viewUniversalIdentifier: VIEW_IDS.financeCategories,
});
