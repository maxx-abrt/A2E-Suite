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

// Inverse of chatMessage.author, declared on the standard workspaceMember
// object: the messages a member authored.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberMessages,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'chatMessages',
  label: 'Messages envoyés',
  description: 'Messages de canal envoyés par ce membre',
  icon: 'IconMessage',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.messageAuthor,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
