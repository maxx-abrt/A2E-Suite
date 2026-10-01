import { defineField, FieldType } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_FIELD_IDS,
  OBJECT_IDS,
} from '../constants/universal-identifiers.ts';

// M9a-3 apply idempotency (US-131). Tags the document a gallery apply created
// with the caller's operation id, so re-invoking the same operation finds the
// row and creates no duplicate — the same provenance pattern the recipe keys
// use. Null on human-made documents.
export default defineField({
  universalIdentifier: DOCUMENT_TEMPLATE_FIELD_IDS.applyOperationId,
  objectUniversalIdentifier: OBJECT_IDS.document,
  type: FieldType.TEXT,
  name: 'templateApplyOperationId',
  label: 'Opération de modèle',
  description:
    'Identifiant d’idempotence de l’application du modèle qui a créé la page',
  icon: 'IconTemplate',
  isNullable: true,
});
