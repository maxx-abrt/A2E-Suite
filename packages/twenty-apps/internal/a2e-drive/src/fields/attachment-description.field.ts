import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ATTACHMENT_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Optional human note shown in the Drive browser, next to the native file
// name. Presentation metadata only (C5).
export default defineField({
  universalIdentifier: ATTACHMENT_FIELD_IDS.description,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: FieldType.TEXT,
  name: 'description',
  label: 'Description',
  icon: 'IconAbc',
  isNullable: true,
});
