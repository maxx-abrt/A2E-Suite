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

// Inverse of chatChannelMember.workspaceMember, declared on the standard
// workspaceMember object: the channels a member belongs to.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberChannelMemberships,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'chatChannelMemberships',
  label: 'Canaux',
  description: 'Canaux de discussion où ce membre est rattaché',
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channelMember,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.channelMemberWorkspaceMember,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
