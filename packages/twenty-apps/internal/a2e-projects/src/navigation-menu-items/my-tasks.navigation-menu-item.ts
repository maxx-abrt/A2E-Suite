import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// "My-tasks" section: pinned to the app's own task view filtered to the
// signed-in member; the native view owns the record query.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasks,
  name: 'My Tasks',
  icon: 'IconCheckbox',
  position: 120,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: VIEW_IDS.taskMyTasks,
});
