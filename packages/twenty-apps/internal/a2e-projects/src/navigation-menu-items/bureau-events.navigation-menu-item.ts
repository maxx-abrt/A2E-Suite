import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS,
  NAVIGATION_MENU_ITEM_IDS,
} from '../constants/universal-identifiers.ts';

export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.bureauEvents,
  name: 'Événements',
  icon: 'IconCalendarEvent',
  position: 4,
  type: NavigationMenuItemType.LINK,
  folderUniversalIdentifier:
    EXTERNAL_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIERS.bureau,
  link: '/calendar',
});
