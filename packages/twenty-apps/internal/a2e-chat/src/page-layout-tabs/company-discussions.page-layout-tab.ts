import {
  definePageLayoutTab,
  type PageLayoutWidgetUniversalConfiguration,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT,
} from 'twenty-sdk/define';

import { PAGE_LAYOUT_TAB_IDS } from '../constants/universal-identifiers.ts';

// The company "Discussions" tab. Declared as a standalone tab on the standard
// company record page (additive) rather than shipping an app page layout, which
// would override every default company tab. The DISCUSSIONS widget auto-hides
// when the `discussions` relation is absent, i.e. when A2E Chat is not
// installed, so no dangling tab is left behind.
export default definePageLayoutTab({
  universalIdentifier: PAGE_LAYOUT_TAB_IDS.companyDiscussions,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT.companyRecordPage.universalIdentifier,
  title: 'Discussions',
  position: 80,
  icon: 'IconMessage',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: PAGE_LAYOUT_TAB_IDS.companyDiscussionsWidget,
      title: 'Discussions',
      // The app pins twenty-sdk 2.31, whose widget type union predates
      // DISCUSSIONS; the server (2.39) owns the enum, so the manifest carries
      // the literal and the config is widened to the SDK shape.
      type: 'DISCUSSIONS',
      configuration: {
        configurationType: 'DISCUSSIONS',
      } as unknown as PageLayoutWidgetUniversalConfiguration,
    },
  ],
});
