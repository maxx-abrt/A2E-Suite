import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  ENTRY_TYPE,
  entryTypeOptions,
  manyToOne,
  oneToMany,
  paymentMethodOptions,
  recurrenceOptions,
} from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// One object for dépenses AND recettes. A workspace's cash reality is a single
// stream; splitting it into two objects would double every view, every filter
// and every rollup for no gain — the `entryType` select is the axis.
export default defineObject({
  universalIdentifier: OBJECT_IDS.financeEntry,
  nameSingular: 'financeEntry',
  namePlural: 'financeEntries',
  labelSingular: 'Mouvement',
  labelPlural: 'Dépenses et recettes',
  description:
    'Dépense ou recette avec justificatifs. Chaque mouvement alimente automatiquement le journal.',
  icon: 'IconArrowsExchange',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.financeEntryLabel,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.financeEntryLabel,
      type: FieldType.TEXT,
      name: 'label',
      label: 'Libellé',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'entryType',
      label: 'Type',
      icon: 'IconArrowsExchange',
      defaultValue: `'${ENTRY_TYPE.EXPENSE}'`,
      options: entryTypeOptions('04'),
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000003',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Montant',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000004',
      type: FieldType.DATE_TIME,
      name: 'entryDate',
      label: 'Date',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000005',
      type: FieldType.SELECT,
      name: 'paymentMethod',
      label: 'Moyen de paiement',
      icon: 'IconCreditCard',
      isNullable: true,
      options: paymentMethodOptions('04'),
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000006',
      type: FieldType.TEXT,
      name: 'reference',
      label: 'Référence',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000007',
      type: FieldType.ARRAY,
      name: 'tags',
      label: 'Étiquettes',
      icon: 'IconTags',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000008',
      type: FieldType.TEXT,
      name: 'notes',
      label: 'Notes',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-000000000009',
      type: FieldType.FILES,
      name: 'receipts',
      label: 'Justificatifs',
      description:
        'Les justificatifs suivent le mouvement jusque dans le journal automatique.',
      icon: 'IconReceipt',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000a',
      type: FieldType.NUMBER,
      name: 'vatRate',
      label: 'Taux de TVA (%)',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000b',
      type: FieldType.CURRENCY,
      name: 'vatAmount',
      label: 'TVA',
      icon: 'IconReceiptTax',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000c',
      type: FieldType.BOOLEAN,
      name: 'isDeductible',
      label: 'TVA déductible',
      icon: 'IconCheck',
      defaultValue: true,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000d',
      type: FieldType.BOOLEAN,
      name: 'isRecurring',
      label: 'Récurrent',
      icon: 'IconRepeat',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000e',
      type: FieldType.SELECT,
      name: 'recurrence',
      label: 'Périodicité',
      icon: 'IconRepeat',
      isNullable: true,
      options: recurrenceOptions('04'),
    },
    {
      universalIdentifier: 'b11a0400-0001-4000-8000-00000000000f',
      type: FieldType.DATE_TIME,
      name: 'nextOccurrenceDate',
      label: 'Prochaine occurrence',
      icon: 'IconCalendarPlus',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.financeEntryCategory,
      type: FieldType.RELATION,
      name: 'category',
      label: 'Catégorie',
      icon: 'IconCategory',
      relationTargetObjectMetadataUniversalIdentifier:
        OBJECT_IDS.financeCategory,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.financeCategoryEntries,
      universalSettings: {
        ...manyToOne('categoryId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.financeEntryInvoice,
      type: FieldType.RELATION,
      name: 'invoice',
      label: 'Facture liée',
      icon: 'IconFileInvoice',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.invoice,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.invoiceFinanceEntries,
      universalSettings: {
        ...manyToOne('invoiceId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.financeEntrySavedSubvention,
      type: FieldType.RELATION,
      name: 'savedSubvention',
      label: 'Dossier de subvention',
      description:
        'Une subvention accordée crée sa recette ici : la provenance reste traçable.',
      icon: 'IconAward',
      relationTargetObjectMetadataUniversalIdentifier:
        OBJECT_IDS.savedSubvention,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.savedSubventionFinanceEntries,
      universalSettings: {
        ...manyToOne('savedSubventionId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.financeEntryLedgerEntries,
      type: FieldType.RELATION,
      name: 'ledgerEntries',
      label: 'Écritures du livre',
      icon: 'IconBook',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.bookEntry,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.bookEntryFinanceEntry,
      universalSettings: oneToMany,
    },
  ],
});
