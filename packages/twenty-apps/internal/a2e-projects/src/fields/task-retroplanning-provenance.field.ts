import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Retroplanning provenance (P4.2). One TEXT value per generated task holding
// `<recipeKey>@v<version>:<taskKey>#<generatedDueAt>`: the identity half lets a
// replan find its own rows, the trailing date lets it tell an untouched task
// (owned) from one whose date a human changed (protected) without a second
// ownership table.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.retroplanningProvenance,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'retroplanningProvenance',
  label: 'Provenance rétroplanning',
  description:
    'Recette et date générée d’une tâche issue d’un rétroplanning (détecte les modifications manuelles)',
  icon: 'IconCalendarStats',
  isNullable: true,
});
