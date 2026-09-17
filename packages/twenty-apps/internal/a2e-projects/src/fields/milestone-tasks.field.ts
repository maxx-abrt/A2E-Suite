import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  RELATION_IDS,
  TASK_FIELD_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of task.milestone (task-milestone.field.ts): the milestone-side
// "tasks" list the record page renders.
export default defineField({
  universalIdentifier: RELATION_IDS.milestoneTasks,
  objectUniversalIdentifier: OBJECT_IDS.milestone,
  type: FieldType.RELATION,
  name: 'tasks',
  label: 'Tâches',
  description: 'Tâches rattachées à ce jalon',
  icon: 'IconCheckbox',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.milestone,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
