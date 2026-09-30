import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_CHROME_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M8c reading control: widen the editor to the full record-page width. Stored
// on the shared document row (workspace preference, like Notion's page-level
// full-width), presentation-only (C5). Defaults to false so existing documents
// keep their current measure.
export default defineField({
  universalIdentifier: DOCUMENT_CHROME_FIELD_IDS.isFullWidth,
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: FieldType.BOOLEAN,
  name: 'isFullWidth',
  label: 'Pleine largeur',
  description: 'Affiche la page sur toute la largeur disponible',
  icon: 'IconLayoutColumns',
  defaultValue: false,
});
