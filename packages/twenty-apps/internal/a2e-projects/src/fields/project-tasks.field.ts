import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Inverse side of task.project, declared from the project side so the
// relation is complete without project.object.ts importing this file.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.tasksOnProject,
  objectUniversalIdentifier: OBJECT_IDS.project,
  type: FieldType.RELATION,
  name: 'tasks',
  label: 'Tâches',
  description: 'Tâches de ce projet',
  icon: 'IconCheckbox',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.project,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
