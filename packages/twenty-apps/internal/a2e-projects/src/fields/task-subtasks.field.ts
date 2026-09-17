import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  RELATION_IDS,
  TASK_FIELD_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of task.parentTask, declared on the standard task object: the
// self-relation's many side. Completes the P4.1 "subtask parent relation".
export default defineField({
  universalIdentifier: RELATION_IDS.subtasks,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'subtasks',
  label: 'Sous-tâches',
  description: 'Sous-tâches de cette tâche',
  icon: 'IconHierarchy',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.parentTask,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
