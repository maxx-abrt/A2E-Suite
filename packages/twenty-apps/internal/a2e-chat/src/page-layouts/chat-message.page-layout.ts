import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Message record page: fields + the native files widget. Attachments use the
// shared attachment/file-storage primitives (P5.1 attachments leg), never a
// chat-owned file table.
export default definePageLayout({
  universalIdentifier: 'c31c0300-0008-4000-8000-000000000001',
  name: 'Message Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.message,
  tabs: [
    {
      universalIdentifier: 'c31c0300-0009-4000-8000-000000000001',
      title: 'Accueil',
      position: 10,
      icon: 'IconMessage',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31c0300-000a-4000-8000-000000000001',
          title: 'Champs clés',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: 'c31c0300-000a-4000-8000-000000000002',
          title: 'Fichiers',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
