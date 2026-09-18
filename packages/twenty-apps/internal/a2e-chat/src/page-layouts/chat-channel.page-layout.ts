import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Channel record page. The message stream is the P5.2 chat page's job
// (sidebar + composer), so this metadata page stays the canonical fields +
// activity surface that every app object ships.
export default definePageLayout({
  universalIdentifier: 'c31c0100-0008-4000-8000-000000000001',
  name: 'Channel Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.channel,
  tabs: [
    {
      universalIdentifier: 'c31c0100-0009-4000-8000-000000000001',
      title: 'Accueil',
      position: 10,
      icon: 'IconMessages',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31c0100-000a-4000-8000-000000000001',
          title: 'Champs clés',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: 'c31c0100-000a-4000-8000-000000000002',
          title: 'Activité',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
