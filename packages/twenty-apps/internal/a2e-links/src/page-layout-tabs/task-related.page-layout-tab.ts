import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT,
} from 'twenty-sdk/define';

import {
  FRONT_COMPONENT_IDS,
  PAGE_LAYOUT_TAB_IDS,
} from '../constants/universal-identifiers.ts';

// Additive "Related" tab on the standard task record page. The parent is the
// standard task layout, always present, so this needs no install-order
// coupling. App-owned: uninstalling A2E Links removes the tab (C3).
export default definePageLayoutTab({
  universalIdentifier: PAGE_LAYOUT_TAB_IDS.taskRelated,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT.taskRecordPage.universalIdentifier,
  title: 'Related',
  position: 90,
  icon: 'IconLink',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: PAGE_LAYOUT_TAB_IDS.taskRelatedWidget,
      title: 'Related',
      type: 'FRONT_COMPONENT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.taskRelatedLinks,
      },
    },
  ],
});
