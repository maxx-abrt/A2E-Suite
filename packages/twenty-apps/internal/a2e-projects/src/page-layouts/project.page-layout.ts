import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import { OBJECT_IDS } from '../constants/universal-identifiers.ts';

// Project record page: metadata widgets only for now. The overview
// front-component widget (health/milestones/activity) is a P4.2 task — it
// slots into the Home tab as a FRONT_COMPONENT widget when it lands.
export default definePageLayout({
  universalIdentifier: 'c31a0200-0008-4000-8000-000000000001',
  name: 'Project Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.project,
  tabs: [
    {
      universalIdentifier: 'c31a0200-0009-4000-8000-000000000001',
      title: 'Accueil',
      position: 10,
      icon: 'IconKanban',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000001',
          title: 'Champs clés',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
          },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000002',
          title: 'Description',
          type: 'FIELD_RICH_TEXT',
          objectUniversalIdentifier: OBJECT_IDS.project,
          configuration: { configurationType: 'FIELD_RICH_TEXT' },
        },
        {
          // Native_record cards: app-owned overview front component (P4.2
          // "overview widget" bullet). Slots in under the fields block.
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000004',
          title: 'Aperçu',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              'c31a0000-0013-4000-8000-000000000006',
          },
        },
      ],
    },
    {
      universalIdentifier: 'c31a0200-0009-4000-8000-000000000002',
      title: 'Timeline',
      position: 20,
      icon: 'IconHistory',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000005',
          title: 'Tâches',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            '20202020-1ba1-48ba-bc83-ef7e5990ed10',
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000006',
          title: 'Jalons',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: OBJECT_IDS.milestone,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000007',
          title: 'Étiquettes',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: OBJECT_IDS.label,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000008',
          title: 'Notes',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            '20202020-0b00-0000-0000-000000000000',
          configuration: { configurationType: 'RECORD_TABLE' },
        },
      ],
    },
  ],
});
