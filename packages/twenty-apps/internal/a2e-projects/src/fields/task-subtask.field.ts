import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { RELATION_IDS, TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// task ➜ task (parent): subtasks. The FK lives on the child task; the
// inverse side renders the parent's Subtasks. Self-referencing relation —
// both sides live on the standard task object.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.parentTask,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'parentTask',
  label: 'Tâche parente',
  description: 'Tâche parente de cette sous-tâche',
  icon: 'IconHierarchy',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.subtasks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'subtaskId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
