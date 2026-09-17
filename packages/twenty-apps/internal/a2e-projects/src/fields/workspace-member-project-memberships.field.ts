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

// Inverse of projectMember.workspaceMember, declared on the standard
// workspaceMember object: a member's project memberships.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberProjectMemberships,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'projectMemberships',
  label: 'Appartenances',
  icon: 'IconUsers',
  description: 'Projets où ce membre est rattaché',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.projectMember,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.projectMemberWorkspaceMember,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
