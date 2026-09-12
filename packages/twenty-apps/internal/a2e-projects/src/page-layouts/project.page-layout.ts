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
          title: 'Champs',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: 'c31a0200-000a-4000-8000-000000000002',
          title: 'Description',
          type: 'FIELD_RICH_TEXT',
          objectUniversalIdentifier: OBJECT_IDS.project,
          configuration: { configurationType: 'FIELD_RICH_TEXT' },
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
      ],
    },
  ],
});
