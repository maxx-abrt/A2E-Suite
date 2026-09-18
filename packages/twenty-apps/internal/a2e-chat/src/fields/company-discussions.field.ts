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

// Inverse of chatChannel.company, declared from the standard company object
// (the `companyProjects` pattern). Standard company always exists, so this side
// adds no install-order dependency.
export default defineField({
  universalIdentifier: RELATION_IDS.companyDiscussions,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'discussions',
  label: 'Discussions',
  description: 'Canaux de discussion liés à cette entreprise',
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channel,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.channelCompany,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
