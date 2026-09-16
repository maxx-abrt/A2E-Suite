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

// Server-side storage for blocknote comment threads (P3.2): the in-editor
// anchor mark travels inside the document body, but thread/comment bodies,
// resolution state and reactions live here, one record per thread — so a
// reload or a second session reads the same discussion. The blocknote
// ThreadData shape is projected as: id → the record's own id, createdAt /
// updatedAt → the engine-provided timestamps, and comments / resolved /
// resolvedBy / metadata → payload columns the front store maps back.
export default defineObject({
  universalIdentifier: OBJECT_IDS.documentCommentThread,
  nameSingular: 'documentCommentThread',
  namePlural: 'documentCommentThreads',
  labelSingular: 'Fil de discussion',
  labelPlural: 'Fils de discussion',
  description:
    'Fil de commentaires ancré dans un document : corps des commentaires, statut de résolution et réactions.',
  icon: 'IconMessage',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.commentThreadId,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.commentThreadId,
      type: FieldType.TEXT,
      name: 'threadId',
      label: 'Identifiant de fil',
      description:
        'Identifiant du fil côté éditeur ; la duplication de document remappe les ancrages, jamais cet identifiant.',
      icon: 'IconAbc',
      isUnique: true,
    },
    {
      universalIdentifier: 'c31a0200-0001-4000-8000-000000000002',
      type: FieldType.RAW_JSON,
      name: 'comments',
      label: 'Commentaires',
      description:
        'Commentaires du fil : corps blocknote, auteur, horodatages et réactions.',
      icon: 'IconMessage',
    },
    {
      universalIdentifier: 'c31a0200-0001-4000-8000-000000000003',
      type: FieldType.BOOLEAN,
      name: 'resolved',
      label: 'Résolu',
      icon: 'IconCheck',
      defaultValue: false,
    },
    {
      universalIdentifier: 'c31a0200-0001-4000-8000-000000000004',
      type: FieldType.TEXT,
      name: 'resolvedBy',
      label: 'Résolu par',
      description: 'Identifiant du membre ayant résolu le fil en dernier.',
      icon: 'IconAbc',
      isNullable: true,
    },
    {
      universalIdentifier: 'c31a0200-0001-4000-8000-000000000005',
      type: FieldType.RAW_JSON,
      name: 'metadata',
      label: 'Métadonnées',
      description: 'Métadonnées arbitraires portées par le fil côté éditeur.',
      icon: 'IconBrackets',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.commentThreadDocument,
      type: FieldType.RELATION,
      name: 'document',
      label: 'Document',
      icon: 'IconNotes',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentCommentThreads,
      universalSettings: {
        ...manyToOne('documentId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
