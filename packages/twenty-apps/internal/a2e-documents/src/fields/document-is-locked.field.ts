import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_CHROME_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M8c lock. A managed flag, not a permission: the lock only gates the
// chrome's own write controls (cover, icon, toggles, child creation) so a
// reader does not mutate a page by accident. It never touches the content or
// the revision token, so the durable-save contract (P3.2) is unaffected —
// provenance-respecting by construction. Defaults to false.
export default defineField({
  universalIdentifier: DOCUMENT_CHROME_FIELD_IDS.isLocked,
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: FieldType.BOOLEAN,
  name: 'isLocked',
  label: 'Page verrouillée',
  description:
    'Verrouille les réglages de la page (couverture, icône, affichage, sous-pages)',
  icon: 'IconLock',
  defaultValue: false,
});
