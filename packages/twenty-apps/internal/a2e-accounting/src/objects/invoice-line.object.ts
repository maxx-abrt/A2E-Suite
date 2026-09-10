import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// One line object serves invoices AND quotes: converting a quote copies its
// lines without a second vocabulary, and the VAT engine has a single input
// shape to reason about.
export default defineObject({
  universalIdentifier: OBJECT_IDS.invoiceLine,
  nameSingular: 'invoiceLine',
  namePlural: 'invoiceLines',
  labelSingular: 'Ligne',
  labelPlural: 'Lignes',
  description:
    'Ligne de facture ou de devis : quantité, prix unitaire, taux de TVA et remise.',
  icon: 'IconListNumbers',
  isSearchable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.invoiceLineLabel,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.invoiceLineLabel,
      type: FieldType.TEXT,
      name: 'label',
      label: 'Désignation',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000002',
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Quantité',
      icon: 'IconNumbers',
      defaultValue: 1,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000003',
      type: FieldType.CURRENCY,
      name: 'unitPrice',
      label: 'Prix unitaire',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000004',
      type: FieldType.NUMBER,
      name: 'vatRate',
      label: 'Taux de TVA (%)',
      description: 'Taux français courants : 0, 2,1, 5,5, 10 ou 20',
      icon: 'IconPercentage',
      defaultValue: 20,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000005',
      type: FieldType.NUMBER,
      name: 'discountPercent',
      label: 'Remise (%)',
      icon: 'IconDiscount',
      defaultValue: 0,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000006',
      type: FieldType.CURRENCY,
      name: 'lineNetTotal',
      label: 'Total HT de la ligne',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000007',
      type: FieldType.CURRENCY,
      name: 'lineTaxTotal',
      label: 'TVA de la ligne',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000008',
      type: FieldType.CURRENCY,
      name: 'lineTotal',
      label: 'Total TTC de la ligne',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0200-0001-4000-8000-000000000009',
      type: FieldType.NUMBER,
      name: 'linePosition',
      label: 'Rang',
      icon: 'IconArrowsSort',
      defaultValue: 0,
    },
    {
      universalIdentifier: RELATION_IDS.invoiceLineInvoice,
      type: FieldType.RELATION,
      name: 'invoice',
      label: 'Facture',
      icon: 'IconFileInvoice',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.invoice,
      relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.invoiceLines,
      universalSettings: {
        ...manyToOne('invoiceId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.invoiceLineQuote,
      type: FieldType.RELATION,
      name: 'quote',
      label: 'Devis',
      icon: 'IconFileDescription',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.quote,
      relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.quoteLines,
      universalSettings: {
        ...manyToOne('quoteId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
