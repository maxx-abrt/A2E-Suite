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

// Inverse of project.lead, declared from the standard workspaceMember side:
// the relation field must live on its target object, which an object-embedded
// field cannot express (ObjectFieldManifest omits objectUniversalIdentifier).
export default defineField({
  universalIdentifier: RELATION_IDS.memberProjects,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
  type: FieldType.RELATION,
  name: 'projects',
  label: 'Projets',
  description: 'Projets dirigés par ce membre',
  icon: 'IconKanban',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.projectLead,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
