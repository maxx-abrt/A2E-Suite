import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Cross-object self-relation ON THE STANDARD task object: task.blockIssue ➜
// the standard note object (app fields may pin notes on tasks like the CRM
// does via taskTarget). One blocking note per task; notes drive the review
// cycle until the task unblocks (deferring nested-subtask UX to P4.2).
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.blockIssue,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'blockIssue',
  label: 'Bloquée par',
  description: 'Note de revue qui conditionne la fin de cette tâche',
  icon: 'IconAlertTriangle',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.blockedTasks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'blockIssueId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
