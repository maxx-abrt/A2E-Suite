import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.documents,
  name: 'Documents',
  icon: 'IconNotes',
  position: 100,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_IDS.allDocuments,
});
