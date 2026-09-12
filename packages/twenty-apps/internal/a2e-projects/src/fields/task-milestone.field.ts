import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS, TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// task ➜ milestone: the FK lives on task; the inverse side renders the
// milestone's Tasks tab. Deleting a milestone detaches (SET_NULL).
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.milestone,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'milestone',
  label: 'Jalon',
  description: 'Jalon auquel cette tâche est rattachée',
  icon: 'IconTarget',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.milestone,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.milestoneTasks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    joinColumnName: 'milestoneTaskId',
    onDelete: OnDeleteAction.SET_NULL,
  },
});
