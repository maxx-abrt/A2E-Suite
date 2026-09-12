import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of task.blockIssue (notes ➜ "Tâches bloquées").
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.blockedTasks,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.note.universalIdentifier,
  type: FieldType.RELATION,
  name: 'blockedTasks',
  label: 'Tâches bloquées',
  description: 'Tâches dont cette note conditionne la fin',
  icon: 'IconCheckList' as never,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    TASK_FIELD_IDS.blockIssue,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
