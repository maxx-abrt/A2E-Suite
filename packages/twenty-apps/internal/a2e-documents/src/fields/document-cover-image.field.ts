import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_CHROME_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M8c page chrome (cover). Standalone manifest on the app-owned `document`
// object (same shape as a2e-projects document-recipe-correlation-key.field.ts):
// the app metadata path needs no server migration. Presentation-only — it
// grants nothing and hides nothing (C5). `coverColor` stays the flat fallback
// when no image URL is set.
export default defineField({
  universalIdentifier: DOCUMENT_CHROME_FIELD_IDS.coverImage,
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: FieldType.TEXT,
  name: 'coverImage',
  label: 'Image de couverture',
  description: 'URL de l’image de couverture de la page',
  icon: 'IconPhoto',
  isNullable: true,
});
