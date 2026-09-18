import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import { NAVIGATION_MENU_ITEM_IDS } from '../constants/universal-identifiers.ts';

// "My tasks" page: one folder at the reserved position 120 (after Projects
// at 110) grouping three smart-list views on the standard task object —
// assigned to me, created by me, overdue. A folder is the existing primitive
// that composes several views into a single collapsible navigation entry.
export default defineNavigationMenuItem({
  universalIdentifier: NAVIGATION_MENU_ITEM_IDS.myTasks,
  name: 'Mes tâches',
  icon: 'IconCheckbox',
  position: 120,
  type: NavigationMenuItemType.FOLDER,
});
