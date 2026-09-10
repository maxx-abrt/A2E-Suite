import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Document record page: the FIELD_RICH_TEXT widget renders the shared
// blocknote editor for the content field; everything else is native metadata
// widgets, so notes/tasks/files/timeline arrive for free on other tabs.
export default definePageLayout({
  universalIdentifier: 'c31a0100-0008-4000-8000-000000000001',
  name: 'Document Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.document,
  tabs: [
    {
      universalIdentifier: 'c31a0100-0009-4000-8000-000000000001',
      title: 'Home',
      position: 10,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31a0100-000a-4000-8000-000000000001',
          title: 'Fields',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: 'c31a0100-000a-4000-8000-000000000002',
          title: 'Contenu',
          type: 'FIELD_RICH_TEXT',
          objectUniversalIdentifier: OBJECT_IDS.document,
          configuration: { configurationType: 'FIELD_RICH_TEXT' },
        },
      ],
    },
    {
      universalIdentifier: 'c31a0100-0009-4000-8000-000000000002',
      title: 'Timeline',
      position: 20,
      icon: 'IconHistory',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31a0100-000a-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
