import { defineObject, FieldType } from 'twenty-sdk/define';

import { oneToMany } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

export default defineObject({
  universalIdentifier: OBJECT_IDS.financeCategory,
  nameSingular: 'financeCategory',
  namePlural: 'financeCategories',
  labelSingular: 'Catégorie',
  labelPlural: 'Catégories',
  description:
    'Catégorie de dépense ou de recette, rattachable à un compte du plan comptable général.',
  icon: 'IconCategory',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.financeCategoryName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.financeCategoryName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'b11a0500-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'categoryKind',
      label: 'Sens',
      icon: 'IconArrowsExchange',
      defaultValue: "'BOTH'",
      options: [
        {
          id: 'b11a0500-0005-4000-8000-000000000001',
          value: 'EXPENSE',
          label: 'Dépense',
          position: 0,
          color: 'red',
        },
        {
          id: 'b11a0500-0005-4000-8000-000000000002',
          value: 'INCOME',
          label: 'Recette',
          position: 1,
          color: 'green',
        },
        {
          id: 'b11a0500-0005-4000-8000-000000000003',
          value: 'BOTH',
          label: 'Les deux',
          position: 2,
          color: 'blue',
        },
      ],
    },
    {
      universalIdentifier: 'b11a0500-0001-4000-8000-000000000003',
      type: FieldType.TEXT,
      name: 'pcgAccount',
      label: 'Compte PCG',
      description:
        'Compte du plan comptable général (606, 641, 740…). Il route la catégorie vers sa ligne dans le budget à l’équilibre.',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0500-0001-4000-8000-000000000004',
      type: FieldType.NUMBER,
      name: 'defaultVatRate',
      label: 'Taux de TVA par défaut (%)',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: 'b11a0500-0001-4000-8000-000000000005',
      type: FieldType.BOOLEAN,
      name: 'isArchived',
      label: 'Archivée',
      description:
        'Une catégorie archivée disparaît des sélecteurs mais reste lisible sur les mouvements passés.',
      icon: 'IconArchive',
      defaultValue: false,
    },
    {
      universalIdentifier: 'b11a0500-0001-4000-8000-000000000006',
      type: FieldType.TEXT,
      name: 'description',
      label: 'Description',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.financeCategoryEntries,
      type: FieldType.RELATION,
      name: 'financeEntries',
      label: 'Mouvements',
      icon: 'IconArrowsExchange',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.financeEntry,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.financeEntryCategory,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.financeCategoryBudgets,
      type: FieldType.RELATION,
      name: 'budgets',
      label: 'Budgets',
      icon: 'IconChartPie',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.budget,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.budgetCategory,
      universalSettings: oneToMany,
    },
  ],
});
