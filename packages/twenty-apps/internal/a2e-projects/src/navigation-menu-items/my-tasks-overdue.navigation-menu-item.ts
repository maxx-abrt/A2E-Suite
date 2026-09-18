import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Smart list 3/3 under the "Mes tâches" folder: open tasks past their due date.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasksOverdue,
  name: 'En retard',
  icon: 'IconAlertTriangle',
  position: 2,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasks,
  viewUniversalIdentifier: VIEW_IDS.taskOverdue,
});
