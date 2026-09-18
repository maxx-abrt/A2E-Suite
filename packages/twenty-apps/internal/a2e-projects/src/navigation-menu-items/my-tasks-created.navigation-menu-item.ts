import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Smart list 2/3 under the "Mes tâches" folder: tasks created by me.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasksCreated,
  name: 'Créées par moi',
  icon: 'IconUserPlus',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasks,
  viewUniversalIdentifier: VIEW_IDS.taskCreatedByMe,
});
