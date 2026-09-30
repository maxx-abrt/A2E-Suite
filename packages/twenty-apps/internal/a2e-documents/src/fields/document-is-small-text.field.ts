import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_CHROME_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M8c reading control: shrink the body text for denser pages. Stored on the
// shared document row, presentation-only (C5). Defaults to false so existing
// documents keep the standard text scale.
export default defineField({
  universalIdentifier: DOCUMENT_CHROME_FIELD_IDS.isSmallText,
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: FieldType.BOOLEAN,
  name: 'isSmallText',
  label: 'Petit texte',
  description: 'Réduit la taille du texte de la page',
  icon: 'IconTextSize',
  defaultValue: false,
});
