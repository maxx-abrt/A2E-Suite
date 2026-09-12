import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.projects,
  name: 'Projects',
  icon: 'IconKanban',
  position: 110,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_IDS.allProjects,
});
