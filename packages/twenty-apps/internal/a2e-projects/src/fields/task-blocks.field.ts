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

// Inverse of task.blockedBy, declared on the standard task object: the many
// side of the dependency self-relation ("tasks this one blocks").
export default defineField({
  universalIdentifier: RELATION_IDS.blocks,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'blocks',
  label: 'Bloque',
  description: 'Tâches que celle-ci bloque',
  icon: 'IconArrowUp',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: TASK_FIELD_IDS.blockedBy,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
