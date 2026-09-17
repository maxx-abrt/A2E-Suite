import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// A date-only checkpoint on a project. The FK lives on milestone so
// deleting a project keeps the milestone rows and their history; per the
// P4.1 turn-note, the date-only default is a server-question open item.
export default defineObject({
  universalIdentifier: OBJECT_IDS.milestone,
  nameSingular: 'milestone',
  namePlural: 'milestones',
  labelSingular: 'Jalon',
  labelPlural: 'Jalons',
  description: 'Jalon projet : livrable daté avec sa date cible et son statut.',
  icon: 'IconTarget',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.milestoneName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.milestoneName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31a0300-0001-4000-8000-000000000002',
      type: FieldType.DATE_TIME,
      name: 'dueAt',
      label: 'Cible',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31a0300-0001-4000-8000-000000000003',
      type: FieldType.DATE_TIME,
      name: 'doneAt',
      label: 'Terminé le',
      description: 'Présent quand le jalon est atteint',
      icon: 'IconCalendarCheck',
      isNullable: true,
    },
    {
      // Trash lifecycle field (P4.3): present = in the corbeille, restore
      // clears it, the purge cron destroys past 7 days (P3 mirror).
      universalIdentifier: 'c31a0300-0001-4000-8000-000000000004',
      type: FieldType.DATE_TIME,
      name: 'archivedAt',
      label: 'Archivé le',
      description: 'Présent = dans la corbeille (restauration 7 jours)',
      icon: 'IconArchive',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.projectMilestone,
      type: FieldType.RELATION,
      name: 'project',
      label: 'Projet',
      icon: 'IconKanban',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.milestoneProjects,
      universalSettings: {
        ...manyToOne('milestoneProjectId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
  ],
});
