import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Folder record page: the native fields widget already renders `parent`,
// `children` and `files` as relation fields, plus the timeline. The Drive
// browser and bulk actions are the P6.2 surface, so this layout stays purely
// metadata.
export default definePageLayout({
  universalIdentifier: 'c31d0100-0008-4000-8000-000000000001',
  name: 'Drive Folder Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.driveFolder,
  tabs: [
    {
      universalIdentifier: 'c31d0100-0009-4000-8000-000000000001',
      title: 'Accueil',
      position: 10,
      icon: 'IconFolder',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31d0100-000a-4000-8000-000000000001',
          title: 'Champs',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: 'c31d0100-0009-4000-8000-000000000002',
      title: 'Chronologie',
      position: 20,
      icon: 'IconHistory',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31d0100-000a-4000-8000-000000000002',
          title: 'Chronologie',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
