import {
  defineObject,
  FieldType,
  OnDeleteAction,
} from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Server-side storage for document version history (P3.2): one row per
// snapshot taken by the editor's save-interval driver, so history survives a
// reload (the in-memory ring buffer can only ever hold the current session).
// `versionId` carries the editor-side snapshot id, `body` the serialized
// blocknote document, and the engine-provided createdAt is the snapshot time.
// Rows hang off the document by the relation join column, so deleting a
// document removes its history (CASCADE) and repository permissions inherit
// from the document.
export default defineObject({
  universalIdentifier: OBJECT_IDS.documentRevision,
  nameSingular: 'documentRevision',
  namePlural: 'documentRevisions',
  labelSingular: 'Version de document',
  labelPlural: 'Versions de document',
  description:
    'Instantané du contenu d’un document, conservé pour l’historique des versions.',
  icon: 'IconHistory',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.revisionVersionId,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.revisionVersionId,
      type: FieldType.TEXT,
      name: 'versionId',
      label: 'Identifiant de version',
      description:
        'Identifiant de l’instantané côté éditeur ; stable pour une même version.',
      icon: 'IconAbc',
      isUnique: true,
    },
    {
      universalIdentifier: 'c31a0300-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'body',
      label: 'Contenu',
      description:
        'Document blocknote sérialisé (JSON) au moment de l’instantané.',
      icon: 'IconFileText',
    },
    {
      universalIdentifier: RELATION_IDS.revisionDocument,
      type: FieldType.RELATION,
      name: 'document',
      label: 'Document',
      icon: 'IconNotes',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentRevisions,
      universalSettings: {
        ...manyToOne('documentId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
