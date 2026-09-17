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

// Inverse of timeEntry.teamMember, declared on the standard workspaceMember
// object: the member's logged sessions.
export default defineField({
  universalIdentifier: RELATION_IDS.workspaceMemberTimeEntries,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'timeEntries',
  label: 'Temps',
  icon: 'IconClock',
  description: 'Temps enregistré par ce membre',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.timeEntry,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.timeEntryWorkspaceMember,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
