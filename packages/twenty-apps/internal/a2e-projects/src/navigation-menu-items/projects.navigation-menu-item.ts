import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Bureau's projects row, nested under the shared "Bureau" folder owned by A2E
// Documents (M7c). Documents is a hard install prerequisite (the `document`
// object relation), so the folder always exists when this row installs. The
// "Mes tâches" folder stays top-level: the nav hierarchy is capped at two
// levels (NAVIGATION_MENU_ITEM_MAX_DEPTH), so a folder of smart lists cannot
// itself nest under Bureau.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.projects,
  name: 'Projets',
  icon: 'IconKanban',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier:
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
  viewUniversalIdentifier: VIEW_IDS.allProjects,
});
