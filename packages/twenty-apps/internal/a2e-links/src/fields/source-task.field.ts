import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { MORPH_IDS, OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Outgoing morph leg over the standard task object. Shares MORPH_IDS.source
// with the document leg.
export default defineField({
  universalIdentifier: RELATION_IDS.sourceTask,
  objectUniversalIdentifier: OBJECT_IDS.a2eLink,
  type: FieldType.MORPH_RELATION,
  name: 'sourceTask',
  label: 'Tâche source',
  description: 'Tâche à l’origine du lien.',
  icon: 'IconCheckbox',
  isNullable: true,
  morphId: MORPH_IDS.source,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.taskOutgoingLinks,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.CASCADE,
    joinColumnName: 'sourceTaskId',
  },
  isUIEditable: false,
});
