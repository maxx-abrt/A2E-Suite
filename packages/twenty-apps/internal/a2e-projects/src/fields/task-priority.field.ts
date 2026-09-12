import { defineField, FieldType } from 'twenty-sdk/define';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

export default defineField({
  universalIdentifier: TASK_FIELD_IDS.priority,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.SELECT,
  name: 'priority',
  label: 'Priorité',
  icon: 'IconFlag',
  isNullable: true,
  options: [
    {
      id: 'c31a0201-0005-4000-8000-000000000061',
      value: 'URGENT',
      label: 'Urgent',
      position: 0,
      color: 'red',
    },
    {
      id: 'c31a0201-0005-4000-8000-000000000062',
      value: 'HIGH',
      label: 'Haute',
      position: 1,
      color: 'orange',
    },
    {
      id: 'c31a0201-0005-4000-8000-000000000063',
      value: 'MEDIUM',
      label: 'Moyenne',
      position: 2,
      color: 'sky',
    },
    {
      id: 'c31a0201-0005-4000-8000-000000000064',
      value: 'LOW',
      label: 'Basse',
      position: 3,
      color: 'gray',
    },
  ],
});
