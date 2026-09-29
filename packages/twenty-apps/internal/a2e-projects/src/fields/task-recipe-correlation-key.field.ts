import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { TASK_FIELD_IDS } from '../constants/universal-identifiers.ts';

// C5 provenance for recipe-minted tasks (US-107). The recipe's deterministic
// correlation key is persisted here; before creating, the handler looks up a
// task carrying it, so a replayed trigger finds its own row instead of a
// duplicate. Deliberately separate from `retroplanningProvenance`: that field
// also encodes a generated date the replanner protects, whereas this one is a
// pure identity marker owned by the cross-app recipe family.
export default defineField({
  universalIdentifier: TASK_FIELD_IDS.recipeCorrelationKey,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier,
  type: FieldType.TEXT,
  name: 'recipeCorrelationKey',
  label: 'Clé de recette',
  description:
    'Clé de corrélation de la recette d’automatisation qui a créé cette tâche (idempotence d’un rejeu)',
  icon: 'IconRepeat',
  isNullable: true,
});
