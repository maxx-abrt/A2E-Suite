import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';

// One folder holds the whole module, so installing Bilan adds a single
// collapsible entry to the workspace navigation instead of eleven loose links.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.folder,
  name: 'Bilan',
  icon: 'IconCoins',
  position: 100,
  type: NavigationMenuItemType.FOLDER,
});
