import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// PERSONAL FAVORITES (P3.3 audit).
//
// The legacy `document.isFavorite` boolean is a field on the shared document
// row: every member reads the same value, so a star one member sets shows up
// in every colleague's sidebar. This join object is the additive fix — one row
// per (member, document), keyed by the acting user id the front component
// reads from `useUserId()`. Each member only ever queries/writes their own
// rows, so favorites are personal without renaming or removing the old flag.
export default defineObject({
  universalIdentifier: OBJECT_IDS.documentFavorite,
  nameSingular: 'documentFavorite',
  namePlural: 'documentFavorites',
  labelSingular: 'Favori de document',
  labelPlural: 'Favoris de document',
  description:
    'Favori personnel d’un document, propre à chaque membre (le drapeau isFavorite partagé est déprécié).',
  icon: 'IconHeart',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.documentFavoriteKey,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.documentFavoriteKey,
      type: FieldType.TEXT,
      name: 'favoriteKey',
      label: 'Clé de favori',
      description:
        'Clé stable `${userId}:${documentId}` : un seul favori vivant par membre et par document.',
      icon: 'IconAbc',
      isUnique: true,
    },
    {
      universalIdentifier: 'c31a0400-0001-4000-8000-000000000002',
      type: FieldType.TEXT,
      name: 'userId',
      label: 'Utilisateur',
      description: 'Identifiant du membre à qui appartient ce favori.',
      icon: 'IconUser',
    },
    {
      universalIdentifier: RELATION_IDS.documentFavoriteDocument,
      type: FieldType.RELATION,
      name: 'document',
      label: 'Document',
      icon: 'IconNotes',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.document,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.documentFavorites,
      universalSettings: {
        ...manyToOne('documentId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
