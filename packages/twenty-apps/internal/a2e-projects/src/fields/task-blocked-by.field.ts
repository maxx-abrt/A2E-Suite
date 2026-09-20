import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  RELATION_IDS,
  TASK_FIELD_IDS,
} from '../constants/universal-identifiers.ts';

// Dependency edge (US-049 decision): task ➜ task, "this task is blocked by".
// Additive and separate from `blockIssue`, which is task ➜ note: a precedence
// link between tasks cannot be expressed through a note relation, and the
// picker's cycle guard needs a real self-relation. The FK lives on the blocked
// task; SET_NULL keeps a task when its blocker is deleted (it unblocks).
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.blockedBy,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'blockedBy',
  label: 'Bloquée par',
  description: 'Tâche qui conditionne la fin de cette tâche',
  icon: 'IconArrowDown',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.blocks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'blockedById',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
