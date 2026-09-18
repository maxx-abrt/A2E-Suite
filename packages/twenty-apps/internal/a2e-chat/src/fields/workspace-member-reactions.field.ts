import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of chatReaction.workspaceMember, declared on the standard
// workspaceMember object: the reactions a member left.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberReactions,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'chatReactions',
  label: 'Réactions',
  description: 'Réactions emoji posées par ce membre',
  icon: 'IconMoodSmile',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.reaction,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.reactionWorkspaceMember,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
