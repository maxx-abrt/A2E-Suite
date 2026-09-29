import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';

// One folder holds the Bureau suite, so the sidebar shows a single collapsible
// "Bureau" entry instead of a loose row per app (M7c). a2e-documents is the
// Bureau root, so it owns the folder; the sibling Bureau apps reference this
// committed identifier as their folderUniversalIdentifier.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.bureauFolder,
  name: 'Bureau',
  icon: 'IconStack2',
  position: 100,
  type: NavigationMenuItemType.FOLDER,
});
