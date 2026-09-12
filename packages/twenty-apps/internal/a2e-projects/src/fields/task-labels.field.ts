import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS, TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// task ➜ taskLabel junction (a task's attachment rows) — the labels
// many-to-many primitive per P4.1. The inverse side renders the task's
// "Étiquettes rattachées" along with the label legs.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.taskLabels,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'taskLabels',
  label: 'Étiquettes',
  description: 'Liaisons tâche-étiquette de cette tâche',
  icon: 'IconTag',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.taskLabel,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.labelsOnTask,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
