import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  FRONT_COMPONENT_IDS,
  OBJECT_IDS,
  VIEW_IDS,
} from '../constants/universal-identifiers.ts';

// Project record page. Home carries the fields/description/overview widgets
// and Timeline the activity + gantt widgets; the P4.2 tabs below add the
// project-scoped task board, task table and file list as separate tabs so
// each concern is one click away. The docs tab waits on the P4.3
// project↔document relation decision and is intentionally absent.
export default definePageLayout({
  universalIdentifier: 'c31b0200-0008-4000-8000-000000000001',
  name: 'Project Record Page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: OBJECT_IDS.project,
  tabs: [
    {
      universalIdentifier: 'c31b0200-0009-4000-8000-000000000001',
      title: 'Accueil',
      position: 10,
      icon: 'IconKanban',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000001',
          title: 'Champs clés',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
          },
        },
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000002',
          title: 'Description',
          type: 'FIELD_RICH_TEXT',
          objectUniversalIdentifier: OBJECT_IDS.project,
          configuration: { configurationType: 'FIELD_RICH_TEXT' },
        },
        {
          // Native_record cards: app-owned overview front component (P4.2
          // "overview widget" bullet). Slots in under the fields block.
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000004',
          title: 'Aperçu',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FRONT_COMPONENT_IDS.projectOverview,
          },
        },
        {
          // Per-project time rollup (P4.2 time tracker): the project's
          // `timeEntry` rows grouped by task. Read-only widget — the
          // start/stop surface is the task-scoped command menu component.
          universalIdentifier: 'c31b0200-000a-4000-8000-00000000000a',
          title: 'Temps',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FRONT_COMPONENT_IDS.projectTimeRollup,
          },
        },
      ],
    },
    {
      universalIdentifier: 'c31b0200-0009-4000-8000-000000000002',
      title: 'Timeline',
      position: 20,
      icon: 'IconHistory',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000003',
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000005',
          title: 'Tâches',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000006',
          title: 'Jalons',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: OBJECT_IDS.milestone,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000007',
          title: 'Étiquettes',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: OBJECT_IDS.label,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000008',
          title: 'Notes',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
          configuration: { configurationType: 'RECORD_TABLE' },
        },
        {
          // Gantt/timeline (P4.2): the project's tasks on a day axis with
          // parentTask dependency arrows. Own front component because the
          // native record table cannot draw a time scale.
          universalIdentifier: 'c31b0200-000a-4000-8000-000000000009',
          title: 'Gantt',
          type: 'FRONT_COMPONENT',
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: FRONT_COMPONENT_IDS.projectGantt,
          },
        },
      ],
    },
    {
      // Task table tab: the project-tasks TABLE view, rendered through the
      // native record-table widget (views are the reusable primitive; the
      // widget adds no list system of its own).
      universalIdentifier: 'c31b0200-0009-4000-8000-000000000003',
      title: 'Tâches',
      position: 30,
      icon: 'IconTable',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-00000000000b',
          title: 'Tâches',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: VIEW_IDS.projectTasks,
          },
        },
      ],
    },
    {
      // Board tab: the P4.2-board-view KANBAN view, projected through the
      // same record-table widget — the renderer reads the view's layout
      // type, so no board component is needed here.
      universalIdentifier: 'c31b0200-0009-4000-8000-000000000004',
      title: 'Tableau',
      position: 40,
      icon: 'IconLayoutKanban',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-00000000000c',
          title: 'Tableau',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewUniversalIdentifier: VIEW_IDS.taskBoard,
          },
        },
      ],
    },
    {
      // Files tab: the native attachments widget (reads the record's
      // polymorphic `attachments` relation, auto-provisioned on app objects).
      universalIdentifier: 'c31b0200-0009-4000-8000-000000000005',
      title: 'Fichiers',
      position: 50,
      icon: 'IconFiles',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'c31b0200-000a-4000-8000-00000000000d',
          title: 'Fichiers',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
