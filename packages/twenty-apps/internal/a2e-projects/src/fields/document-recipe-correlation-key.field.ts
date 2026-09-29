import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_FIELD_IDS,
  EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS,
} from '../constants/universal-identifiers.ts';

// C5 provenance pinned on A2E Documents' `document` object (same app-owned
// standalone-field shape as document-project.field.ts, so the FK-free field
// needs no relation slot). The « réunion → page de notes » recipe tags every
// page it creates with its deterministic correlation key; a replay finds its
// own page through this marker instead of creating a second one.
export default defineField({
  universalIdentifier: DOCUMENT_FIELD_IDS.recipeCorrelationKey,
  objectUniversalIdentifier: EXTERNAL_OBJECT_UNIVERSAL_IDENTIFIERS.document,
  type: FieldType.TEXT,
  name: 'recipeCorrelationKey',
  label: 'Clé de recette',
  description:
    'Clé de corrélation de la recette d’automatisation qui a créé ce document (idempotence d’un rejeu)',
  icon: 'IconRepeat',
  isNullable: true,
});
