import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ATTACHMENT_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Bureau `sourceApp` attribution: which surface created the file (chat,
// documents, projects, CRM, an app). It is a label for filtering and display,
// deliberately TEXT so a future surface is not blocked by an enum — and
// strictly not ownership or permission (C5).
export default defineField({
  universalIdentifier: ATTACHMENT_FIELD_IDS.sourceApp,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: FieldType.TEXT,
  name: 'sourceApp',
  label: 'Application source',
  description:
    'Surface d’origine du fichier (attribution, jamais une permission)',
  icon: 'IconApps',
  isNullable: true,
});
