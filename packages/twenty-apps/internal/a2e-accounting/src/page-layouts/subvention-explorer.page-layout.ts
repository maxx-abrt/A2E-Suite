import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  FRONT_COMPONENT_IDS,
  PAGE_LAYOUT_IDS,
} from '../constants/universal-identifiers.ts';

export default definePageLayout({
  universalIdentifier: PAGE_LAYOUT_IDS.subventionExplorer,
  name: 'Trouver des aides',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: PAGE_LAYOUT_IDS.subventionExplorerTab,
      title: 'Catalogue',
      position: 0,
      icon: 'IconSearch',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: 'b11a0000-000a-4000-8000-000000000101',
          title: 'Explorateur de subventions',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FRONT_COMPONENT_IDS.subventionExplorer,
          },
        },
      ],
    },
  ],
});
