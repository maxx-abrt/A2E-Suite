import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  PAGE_LAYOUT_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.explorer,
  name: 'Trouver des aides',
  icon: 'IconSearch',
  position: 7,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.folder,
  pageLayoutUniversalIdentifier: PAGE_LAYOUT_IDS.subventionExplorer,
});
