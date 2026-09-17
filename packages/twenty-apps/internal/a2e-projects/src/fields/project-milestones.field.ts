import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of milestone.project, declared on the project object (the "one"
// side of the relation — the FK lives on milestone.object.ts).
export default defineField({
  universalIdentifier: RELATION_IDS.milestoneProjects,
  objectUniversalIdentifier: OBJECT_IDS.project,
  type: FieldType.RELATION,
  name: 'milestones',
  label: 'Jalons',
  icon: 'IconTarget',
  description: 'Jalons de ce projet',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.milestone,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.projectMilestone,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
