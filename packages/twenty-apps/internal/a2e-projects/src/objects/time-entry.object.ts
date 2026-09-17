import {
  defineObject,
  FieldType,
  OnDeleteAction,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Time logged on a task and/or project. The workspaceMember FK CASCADEs:
// removing the person removes their logged sessions with them, mirroring
// how Twenty treats assignee bookkeeping.
export default defineObject({
  universalIdentifier: OBJECT_IDS.timeEntry,
  nameSingular: 'timeEntry',
  namePlural: 'timeEntries',
  labelSingular: 'Temps',
  labelPlural: 'Temps',
  description: 'Temps passé sur une tâche ou un projet.',
  icon: 'IconClock',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.timeEntryLabel,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.timeEntryLabel,
      type: FieldType.TEXT,
      name: 'label',
      label: 'Libellé',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000002',
      type: FieldType.NUMBER,
      name: 'minutes',
      label: 'Minutes',
      icon: 'IconClock',
      defaultValue: 0,
    },
    {
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000003',
      type: FieldType.DATE_TIME,
      name: 'spentAt',
      label: 'Passé le',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      // Trash lifecycle field (P4.3): present = in the corbeille, restore
      // clears it, the purge cron destroys past 7 days (P3 mirror).
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000004',
      type: FieldType.DATE_TIME,
      name: 'archivedAt',
      label: 'Archivé le',
      description: 'Présent = dans la corbeille (restauration 7 jours)',
      icon: 'IconArchive',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.timeEntryTask,
      type: FieldType.RELATION,
      name: 'task',
      label: 'Tâche',
      icon: 'IconDate',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.taskTimeEntries,
      universalSettings: {
        ...manyToOne('timeEntryTaskId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.timeEntryProject,
      type: FieldType.RELATION,
      name: 'project',
      label: 'Projet',
      icon: 'IconKanban',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.projectTimeEntries,
      universalSettings: {
        ...manyToOne('timeEntryProjectId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.timeEntryWorkspaceMember,
      type: FieldType.RELATION,
      name: 'teamMember',
      label: 'Qui',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberTimeEntries,
      universalSettings: {
        ...manyToOne('timeEntryTeamMemberId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
