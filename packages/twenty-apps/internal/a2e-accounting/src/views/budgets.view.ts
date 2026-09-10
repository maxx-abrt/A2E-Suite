import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.budget;
const id = (position: number) => viewFieldId('06', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.budgets,
  name: 'Budgets',
  objectUniversalIdentifier: OBJECT_IDS.budget,
  icon: 'IconChartPie',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 220,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.amount,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.spentAmount,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.spentPercent,
      position: 3,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.alertLevel,
      position: 4,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.period,
      position: 5,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(6),
      fieldMetadataUniversalIdentifier: field.startDate,
      position: 6,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(7),
      fieldMetadataUniversalIdentifier: field.endDate,
      position: 7,
      isVisible: true,
      size: 140,
    },
  ],
});
