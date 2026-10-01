import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Save-time mention index (M8d). `MentionInlineContent` stores the mention
// nodes inside the blocknote body; scanning that body on every record-page read
// would be a full-text scan, so the save pipeline extracts the nodes once and
// persists one row per (source document, mentioned record) here. The "Mentioned
// in" read then resolves documents from this index alone.
//
// The target is polymorphic by design (a document can mention a task, a
// company, a person): it is stored as an object-name + record-id pair rather
// than a relation, because a morph target would need one leg per object while
// the index only ever reads it back as a filter. `mentionKey` is the stable
// `${documentId}:${objectNameSingular}:${recordId}` key that makes re-indexing
// diff-based and duplicate-free. Rows hang off the document by the join column,
// so deleting a document removes its index (CASCADE) and repository permissions
// inherit from it.
export default defineObject({
  universalIdentifier: OBJECT_IDS.documentMention,
  nameSingular: 'documentMention',
  namePlural: 'documentMentions',
  labelSingular: 'Mention de document',
  labelPlural: 'Mentions de document',
  description:
    'Index des mentions enregistrées dans le corps d’un document, par document source et enregistrement mentionné.',
  icon: 'IconAt',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.documentMentionKey,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.documentMentionKey,
      type: FieldType.TEXT,
      name: 'mentionKey',
      label: 'Clé de mention',
      description:
        'Clé stable `${documentId}:${objectNameSingular}:${recordId}` : une seule ligne par document source et enregistrement mentionné.',
      icon: 'IconAbc',
      isUnique: true,
    },
    {
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'targetObjectNameSingular',
      label: 'Objet mentionné',
      description: 'Nom singulier de l’objet de l’enregistrement mentionné.',
      icon: 'IconBox',
    },
    {
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000003',
      type: FieldType.TEXT,
      name: 'targetRecordId',
      label: 'Enregistrement mentionné',
      description: 'Identifiant de l’enregistrement mentionné.',
      icon: 'IconId',
    },
    {
      universalIdentifier: 'c31a0500-0001-4000-8000-000000000004',
      type: FieldType.TEXT,
      name: 'targetLabel',
      label: 'Libellé mentionné',
      description:
        'Libellé affiché au moment de la mention ; rafraîchi au ré-enregistrement.',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.documentMentionDocument,
      type: FieldType.RELATION,
      name: 'document',
      label: 'Document source',
      icon: 'IconNotes',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentMentions,
      universalSettings: {
        ...manyToOne('documentId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
