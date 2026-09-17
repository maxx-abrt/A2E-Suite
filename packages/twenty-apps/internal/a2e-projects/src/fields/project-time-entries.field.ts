import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Inverse of timeEntry.project, declared on the project object.
export default defineField({
  universalIdentifier: RELATION_IDS.projectTimeEntries,
  objectUniversalIdentifier: OBJECT_IDS.project,
  type: FieldType.RELATION,
  name: 'timeEntries',
  label: 'Temps',
  icon: 'IconClock',
  description: 'Temps enregistré sur ce projet',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.timeEntry,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.timeEntryProject,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
