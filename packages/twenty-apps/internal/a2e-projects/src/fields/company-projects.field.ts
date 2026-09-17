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

// Inverse of project.company, declared from the standard company side.
export default defineField({
  universalIdentifier: RELATION_IDS.companyProjects,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'projects',
  label: 'Projets',
  description: 'Projets liés à cette entreprise',
  icon: 'IconKanban',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.project,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.projectCompany,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
