import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  EXTERNAL_OBJECT_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of chatChannel.project, declared from A2E Projects' project object.
// Both sides are owned by A2E Chat (D-P4.3-DOC consumer-owns rule): the record
// page's discussions tab reads conversations through this relation.
export default defineField({
  universalIdentifier: RELATION_IDS.projectDiscussions,
  objectUniversalIdentifier: EXTERNAL_OBJECT_IDS.project,
  type: FieldType.RELATION,
  name: 'discussions',
  label: 'Discussions',
  description: 'Canaux de discussion liés à ce projet',
  icon: 'IconMessages',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channel,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.channelProject,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
