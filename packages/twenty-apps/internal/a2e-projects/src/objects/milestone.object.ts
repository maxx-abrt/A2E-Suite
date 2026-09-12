import {
  defineObject,
  FieldType,
  OnDeleteAction,
} from 'twenty-sdk/define';

import { manyToOne, oneToMany } from '../constants/field-vocabulary.ts';
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
    {
      universalIdentifier: RELATION_IDS.milestoneProjects,
      type: FieldType.RELATION,
      name: 'milestones',
      label: 'Jalons',
      icon: 'IconTarget',
      description: 'Jalons de ce projet',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.milestone,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.projectMilestone,
      universalSettings: oneToMany,
    },
  ],
});
