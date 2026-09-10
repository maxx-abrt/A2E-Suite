import { defineObject, FieldType } from 'twenty-sdk/define';

import { oneToMany } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// The "Livre". One sheet per workspace is a SYSTEM sheet
// (systemKey = bilan.default.ledger, isDefault, isLocked): the auto-journal that
// every cash movement writes into. The others are free sheets or templates the
// user builds for a specific need.
export default defineObject({
  universalIdentifier: OBJECT_IDS.bookSheet,
  nameSingular: 'bookSheet',
  namePlural: 'bookSheets',
  labelSingular: 'Livre',
  labelPlural: 'Livres',
  description:
    "Feuille du livre comptable. Le journal automatique est la feuille système du workspace : verrouillée, alimentée par chaque mouvement.",
  icon: 'IconBook',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.bookSheetName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.bookSheetName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'sheetKind',
      label: 'Nature',
      icon: 'IconLayoutList',
      defaultValue: "'CUSTOM'",
      options: [
        {
          id: 'b11a0700-0005-4000-8000-000000000001',
          value: 'LEDGER',
          label: 'Journal automatique',
          position: 0,
          color: 'green',
        },
        {
          id: 'b11a0700-0005-4000-8000-000000000002',
          value: 'CUSTOM',
          label: 'Feuille libre',
          position: 1,
          color: 'blue',
        },
        {
          id: 'b11a0700-0005-4000-8000-000000000003',
          value: 'TEMPLATE',
          label: 'Modèle',
          position: 2,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000003',
      type: FieldType.TEXT,
      name: 'systemKey',
      label: 'Clé système',
      description:
        'bilan.default.ledger identifie le journal automatique du workspace. Une seule feuille peut la porter.',
      icon: 'IconKey',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000004',
      type: FieldType.BOOLEAN,
      name: 'isDefault',
      label: 'Feuille par défaut',
      icon: 'IconStar',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000005',
      type: FieldType.BOOLEAN,
      name: 'isLocked',
      label: 'Verrouillée',
      description:
        'Une feuille verrouillée ne se supprime pas et ses colonnes gérées restent en lecture seule.',
      icon: 'IconLock',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000006',
      type: FieldType.BOOLEAN,
      name: 'isTemplate',
      label: 'Modèle réutilisable',
      icon: 'IconCopy',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000007',
      type: FieldType.RAW_JSON,
      name: 'columns',
      label: 'Colonnes',
      description:
        'Définition typée des colonnes : id, nom, type, largeur, options et indicateur de colonne gérée.',
      icon: 'IconColumns',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000008',
      type: FieldType.TEXT,
      name: 'description',
      label: 'Description',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-000000000009',
      type: FieldType.TEXT,
      name: 'fiscalYear',
      label: 'Exercice',
      icon: 'IconCalendarStats',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0700-0001-4000-8000-00000000000a',
      type: FieldType.DATE_TIME,
      name: 'periodLockedUntil',
      label: 'Période clôturée jusqu’au',
      description:
        'Après clôture, les écritures antérieures ne bougent plus ; seul un administrateur peut rouvrir.',
      icon: 'IconLockCheck',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.bookSheetEntries,
      type: FieldType.RELATION,
      name: 'entries',
      label: 'Écritures',
      icon: 'IconListDetails',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.bookEntry,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.bookEntrySheet,
      universalSettings: oneToMany,
    },
  ],
});
