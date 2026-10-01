import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { MORPH_IDS, OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Incoming/target morph leg over the standard task object. Shares
// MORPH_IDS.target with the document leg.
export default defineField({
  universalIdentifier: RELATION_IDS.targetTask,
  objectUniversalIdentifier: OBJECT_IDS.a2eLink,
  type: FieldType.MORPH_RELATION,
  name: 'targetTask',
  label: 'Tâche cible',
  description: 'Tâche pointée par le lien.',
  icon: 'IconCheckbox',
  isNullable: true,
  morphId: MORPH_IDS.target,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.taskIncomingLinks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'targetTaskId',
  },
  isUIEditable: false,
});
