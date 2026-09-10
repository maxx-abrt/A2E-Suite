import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.sources,
  name: 'Sources du catalogue',
  icon: 'IconDatabase',
  position: 12,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.folder,
  viewUniversalIdentifier: VIEW_IDS.subventionSources,
});
