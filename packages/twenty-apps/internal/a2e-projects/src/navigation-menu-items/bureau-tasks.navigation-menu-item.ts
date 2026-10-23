import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.bureauTasks,
  name: 'Tâches',
  icon: 'IconCheckbox',
  position: 3,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier:
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
  viewUniversalIdentifier: VIEW_IDS.projectTasks,
});
