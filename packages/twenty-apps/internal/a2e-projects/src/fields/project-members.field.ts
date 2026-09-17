import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of projectMember.project, declared on the project object so the
// record page's "Membres" list resolves to the junction rows.
export default defineField({
  universalIdentifier: RELATION_IDS.projectMembers,
  objectUniversalIdentifier: OBJECT_IDS.project,
  type: FieldType.RELATION,
  name: 'members',
  label: 'Membres',
  icon: 'IconUsers',
  description: 'Équipe du projet (rattachements)',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.projectMember,
  relationTargetFieldMetadataUniversalIdentifier:
    RELATION_IDS.projectMemberProject,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
