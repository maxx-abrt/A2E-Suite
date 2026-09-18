import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Smart list 1/3 under the "Mes tâches" folder: tasks assigned to me.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasksAssigned,
  name: 'Assignées à moi',
  icon: 'IconUserCheck',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasks,
  viewUniversalIdentifier: VIEW_IDS.taskMyTasks,
});
