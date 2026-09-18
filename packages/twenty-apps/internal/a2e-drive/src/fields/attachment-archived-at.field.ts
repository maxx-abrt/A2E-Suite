import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { ATTACHMENT_FIELD_IDS } from '../constants/universal-identifiers.ts';

// Corbeille marker for Drive's files, mirroring the document/project
// `archivedAt`: present = in the corbeille for 7 days, null = live. It is the
// one retention scheme the Drive page and purge-drive-trash both read.
export default defineField({
  universalIdentifier: ATTACHMENT_FIELD_IDS.archivedAt,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.attachment.universalIdentifier,
  type: FieldType.DATE_TIME,
  name: 'archivedAt',
  label: 'Archivé le',
  description: 'Présent = dans la corbeille (restauration 7 jours)',
  icon: 'IconArchive',
  isNullable: true,
});
