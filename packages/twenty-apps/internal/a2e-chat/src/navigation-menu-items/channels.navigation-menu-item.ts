import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Position 130 keeps A2E Chat after Documents (100) and Projects (110/120) in
// the workspace nav; users can reorder/hide it like any native item.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.channels,
  name: 'Discussions',
  icon: 'IconMessages',
  position: 130,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_IDS.allChannels,
});
