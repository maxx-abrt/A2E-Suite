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

// Inverse of timeEntry.task, declared on the standard task object.
export default defineField({
  universalIdentifier: RELATION_IDS.taskTimeEntries,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.RELATION,
  name: 'timeEntries',
  label: 'Temps',
  icon: 'IconClock',
  description: 'Temps enregistré sur cette tâche',
  relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.timeEntry,
  relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.timeEntryTask,
  universalSettings: { relationType: RelationType.ONE_TO_MANY },
});
