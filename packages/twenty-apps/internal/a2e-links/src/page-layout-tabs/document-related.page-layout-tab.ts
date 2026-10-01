import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import {
  DOCUMENT_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  FRONT_COMPONENT_IDS,
  PAGE_LAYOUT_TAB_IDS,
} from '../constants/universal-identifiers.ts';

// Additive "Related" tab on the document record page. Declared as a standalone
// app-owned tab (the a2e-chat company-discussions pattern) instead of shipping
// a full RECORD_PAGE, which would clobber A2E Documents' own document layout.
// The tab belongs to A2E Links, so uninstalling the app removes it with the
// rest of the manifest — no dangling surface (C3).
export default definePageLayoutTab({
  universalIdentifier: PAGE_LAYOUT_TAB_IDS.documentRelated,
  pageLayoutUniversalIdentifier:
    DOCUMENT_RECORD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Related',
  position: 90,
  icon: 'IconLink',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: PAGE_LAYOUT_TAB_IDS.documentRelatedWidget,
      title: 'Related',
      type: 'FRONT_COMPONENT',
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          FRONT_COMPONENT_IDS.documentRelatedLinks,
      },
    },
  ],
});
