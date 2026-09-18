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

// Inverse of chatReadCursor.workspaceMember, declared on the standard
// workspaceMember object: a member's per-channel read positions.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberReadCursors,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'chatReadCursors',
  label: 'Curseurs de lecture',
  description: 'Derniers messages lus par ce membre, par canal',
  icon: 'IconEye',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.readCursor,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.readCursorWorkspaceMember,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
