import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  ENTRY_TYPE,
  entryTypeOptions,
  manyToOne,
} from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

export default defineObject({
  universalIdentifier: OBJECT_IDS.bookEntry,
  nameSingular: 'bookEntry',
  namePlural: 'bookEntries',
  labelSingular: 'Écriture',
  labelPlural: 'Écritures',
  description:
    "Ligne du livre. Une écriture automatique porte sa provenance (sourceKind + sourceId) et n'est modifiable que par son commentaire.",
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.bookEntryLabel,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.bookEntryLabel,
      type: FieldType.TEXT,
      name: 'label',
      label: 'Libellé',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000002',
      type: FieldType.DATE_TIME,
      name: 'entryDate',
      label: 'Date',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000003',
      type: FieldType.SELECT,
      name: 'entryType',
      label: 'Type',
      icon: 'IconArrowsExchange',
      defaultValue: `'${ENTRY_TYPE.EXPENSE}'`,
      options: entryTypeOptions('08'),
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000004',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Montant',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000005',
      type: FieldType.TEXT,
      name: 'categoryLabel',
      label: 'Catégorie',
      icon: 'IconCategory',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000006',
      type: FieldType.TEXT,
      name: 'paymentMethodLabel',
      label: 'Moyen de paiement',
      icon: 'IconCreditCard',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000007',
      type: FieldType.TEXT,
      name: 'reference',
      label: 'Référence',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000008',
      type: FieldType.RAW_JSON,
      name: 'cells',
      label: 'Cellules',
      description:
        'Valeurs par colonne de la feuille. Les colonnes gérées sont réécrites à chaque synchronisation.',
      icon: 'IconTable',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-000000000009',
      type: FieldType.BOOLEAN,
      name: 'isAuto',
      label: 'Écriture automatique',
      icon: 'IconRobot',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-00000000000a',
      type: FieldType.SELECT,
      name: 'sourceKind',
      label: 'Origine',
      icon: 'IconRoute',
      defaultValue: "'MANUAL'",
      options: [
        {
          id: 'b11a0800-0005-4000-8000-000000000001',
          value: 'FINANCE_ENTRY',
          label: 'Mouvement',
          position: 0,
          color: 'blue',
        },
        {
          id: 'b11a0800-0005-4000-8000-000000000002',
          value: 'INVOICE',
          label: 'Facture',
          position: 1,
          color: 'purple',
        },
        {
          id: 'b11a0800-0005-4000-8000-000000000003',
          value: 'SUBVENTION',
          label: 'Subvention',
          position: 2,
          color: 'green',
        },
        {
          id: 'b11a0800-0005-4000-8000-000000000004',
          value: 'MANUAL',
          label: 'Saisie manuelle',
          position: 3,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-00000000000b',
      type: FieldType.TEXT,
      name: 'sourceId',
      label: 'Identifiant source',
      icon: 'IconId',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-00000000000c',
      type: FieldType.TEXT,
      name: 'sourceKey',
      label: 'Clé de provenance',
      description:
        "sourceKind:sourceId — clé d'idempotence : rejouer un événement met à jour la ligne au lieu de la dupliquer.",
      icon: 'IconKey',
      isNullable: true,
      isUnique: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-00000000000d',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Commentaire',
      description:
        'Le seul champ libre sur une écriture automatique : il survit à toutes les synchronisations.',
      icon: 'IconMessage',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0800-0001-4000-8000-00000000000e',
      type: FieldType.FILES,
      name: 'proofs',
      label: 'Justificatifs',
      icon: 'IconReceipt',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.bookEntrySheet,
      type: FieldType.RELATION,
      name: 'sheet',
      label: 'Feuille',
      icon: 'IconBook',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.bookSheet,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.bookSheetEntries,
      universalSettings: {
        ...manyToOne('sheetId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.bookEntryFinanceEntry,
      type: FieldType.RELATION,
      name: 'financeEntry',
      label: 'Mouvement source',
      icon: 'IconArrowsExchange',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.financeEntry,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.financeEntryLedgerEntries,
      universalSettings: {
        ...manyToOne('financeEntryId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.bookEntryInvoice,
      type: FieldType.RELATION,
      name: 'invoice',
      label: 'Facture source',
      icon: 'IconFileInvoice',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.invoice,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.invoiceLedgerEntries,
      universalSettings: {
        ...manyToOne('invoiceId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
  ],
});
