import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// App fields pinned on the STANDARD task object — same asset pattern as
// real-estate's personType.field.ts (fields/ + standalone at build time).
// Task keeps its native title/dueAt/assignee; these add the project layer.

// task ➜ project: the FK lives on task; the inverse side renders the
// project's Tasks tab. Deleting a project orphans its tasks on purpose
// (SET_NULL), matching how Twenty treats assignee deletion.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.project,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'project',
  label: 'Projet',
  description: 'Projet auquel cette tâche appartient',
  icon: 'IconKanban',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
  relationTargetFieldMetadataUniversalIdentifier:
    TASK_FIELD_IDS.tasksOnProject,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'projectId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
