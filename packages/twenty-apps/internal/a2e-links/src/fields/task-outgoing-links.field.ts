import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { OBJECT_IDS, RELATION_IDS } from '../constants/universal-identifiers.ts';

// Inverse of the outgoing task morph group, attached to the standard task
// object through a standalone app-owned field manifest.
export default defineField({
  universalIdentifier: RELATION_IDS.taskOutgoingLinks,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'outgoingLinks',
  label: 'Liens sortants',
  description: 'Liens dont cette tâche est la source.',
  icon: 'IconArrowRight',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.a2eLink,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.sourceTask,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
  isUIEditable: false,
});
