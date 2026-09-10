import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

export default defineObject({
  universalIdentifier: OBJECT_IDS.budget,
  nameSingular: 'budget',
  namePlural: 'budgets',
  labelSingular: 'Budget',
  labelPlural: 'Budgets',
  description:
    'Enveloppe par catégorie et par période, avec cumul du réalisé et alerte de dépassement.',
  icon: 'IconChartPie',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.budgetName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.budgetName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000002',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Enveloppe',
      icon: 'IconCurrencyEuro',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000003',
      type: FieldType.SELECT,
      name: 'period',
      label: 'Période',
      icon: 'IconCalendarRepeat',
      defaultValue: "'YEARLY'",
      options: [
        {
          id: 'b11a0600-0005-4000-8000-000000000001',
          value: 'MONTHLY',
          label: 'Mensuelle',
          position: 0,
          color: 'blue',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000002',
          value: 'QUARTERLY',
          label: 'Trimestrielle',
          position: 1,
          color: 'purple',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000003',
          value: 'YEARLY',
          label: 'Annuelle',
          position: 2,
          color: 'green',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000004',
          value: 'CUSTOM',
          label: 'Personnalisée',
          position: 3,
          color: 'gray',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000004',
      type: FieldType.DATE_TIME,
      name: 'startDate',
      label: 'Début',
      icon: 'IconCalendar',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000005',
      type: FieldType.DATE_TIME,
      name: 'endDate',
      label: 'Fin',
      icon: 'IconCalendarDue',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000006',
      type: FieldType.NUMBER,
      name: 'alertThresholdPercent',
      label: "Seuil d'alerte (%)",
      icon: 'IconAlertTriangle',
      defaultValue: 80,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000007',
      type: FieldType.CURRENCY,
      name: 'spentAmount',
      label: 'Réalisé',
      description:
        'Cumul recalculé chaque nuit sur les mouvements de la période et de la catégorie.',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000008',
      type: FieldType.NUMBER,
      name: 'spentPercent',
      label: 'Consommation (%)',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-000000000009',
      type: FieldType.SELECT,
      name: 'alertLevel',
      label: 'Niveau',
      icon: 'IconAlertCircle',
      defaultValue: "'OK'",
      options: [
        {
          id: 'b11a0600-0005-4000-8000-000000000011',
          value: 'OK',
          label: 'Sous contrôle',
          position: 0,
          color: 'green',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000012',
          value: 'WARNING',
          label: "Seuil d'alerte franchi",
          position: 1,
          color: 'yellow',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000013',
          value: 'REACHED',
          label: 'Enveloppe atteinte',
          position: 2,
          color: 'orange',
        },
        {
          id: 'b11a0600-0005-4000-8000-000000000014',
          value: 'EXCEEDED',
          label: 'Enveloppe dépassée',
          position: 3,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-00000000000a',
      type: FieldType.DATE_TIME,
      name: 'lastRollupAt',
      label: 'Dernier calcul',
      icon: 'IconRefresh',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0600-0001-4000-8000-00000000000b',
      type: FieldType.TEXT,
      name: 'notes',
      label: 'Notes',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.budgetCategory,
      type: FieldType.RELATION,
      name: 'category',
      label: 'Catégorie',
      icon: 'IconCategory',
      relationTargetObjectMetadataUniversalIdentifier:
        OBJECT_IDS.financeCategory,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.financeCategoryBudgets,
      universalSettings: {
        ...manyToOne('categoryId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
  ],
});
