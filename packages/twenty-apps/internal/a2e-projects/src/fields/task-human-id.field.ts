import { defineField, FieldType } from 'twenty-sdk/define';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Human-readable js identifier, minted by the task-human-id logic function
// from the project's persisted counter; never recomputed on edit.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.humanId,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'humanId',
  label: 'Identifiant',
  description: 'Identifiant lisible CLÉ-n (attribué à la création)',
  icon: 'IconHash',
  isNullable: true,
});
