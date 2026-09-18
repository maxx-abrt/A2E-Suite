import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Position 140 keeps A2E Drive after Documents (100), Projects (110/120) and
// Chat (130) in the workspace nav; users can reorder or hide it like any
// native item.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.drive,
  name: 'Drive',
  icon: 'IconFolder',
  position: 140,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_IDS.allDriveFolders,
});
