import { defineField, FieldType } from 'twenty-sdk/define';

import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Task pipeline status. One shared pipeline across projects (option ids are
// committed forever); the P4.2 board groups on this field.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.projectStatus,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.SELECT,
  name: 'projectStatus',
  label: 'Statut',
  description: 'Phase du pipeline projet de la tâche',
  icon: 'IconProgress',
  isNullable: true,
  defaultValue: `'TODO'`,
  options: [
    {
      id: 'c31a0201-0005-4000-8000-000000000051',
      value: 'TODO',
      label: 'À faire',
      position: 0,
      color: 'gray',
    },
    {
      id: 'c31a0201-0005-4000-8000-000000000052',
      value: 'IN_PROGRESS',
      label: 'En cours',
      position: 1,
      color: 'blue',
    },
    {
      id: 'c31a0201-0005-4000-8000-000000000053',
      value: 'DONE',
      label: 'Terminé',
      position: 2,
      color: 'green',
    },
  ],
});
