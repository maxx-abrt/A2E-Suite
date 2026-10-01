import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse of the target task morph group: backlinks to this task.
export default defineField({
  universalIdentifier: RELATION_IDS.taskIncomingLinks,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'incomingLinks',
  label: 'Liens entrants',
  description: 'Liens dont cette tâche est la cible (backlinks).',
  icon: 'IconArrowLeft',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.a2eLink,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.targetTask,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
  isUIEditable: false,
});
