import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ATTACHMENT_FIELD_IDS } from '../constants/universal-identifiers.ts';

// A personal quick mark for the Drive browser. Presentation metadata only:
// it grants nothing and hides nothing (C5).
export default defineField({
  universalIdentifier: ATTACHMENT_FIELD_IDS.starred,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: FieldType.BOOLEAN,
  name: 'starred',
  label: 'Favori',
  description: 'Marque rapide Drive, sans effet sur les permissions',
  icon: 'IconStar',
  defaultValue: false,
});
