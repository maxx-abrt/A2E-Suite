import { defineView, ViewSortDirection } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  RELATION_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.financeEntry;
const id = (position: number) => viewFieldId('04', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.financeEntries,
  name: 'Dépenses et recettes',
  objectUniversalIdentifier: OBJECT_IDS.financeEntry,
  icon: 'IconArrowsExchange',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.label,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.entryType,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.amount,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.entryDate,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: RELATION_IDS.financeEntryCategory,
      position: 4,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.paymentMethod,
      position: 5,
      isVisible: true,
      size: 140,
    },
  ],
  sorts: [
    {
      universalIdentifier: viewFieldId('04', 0, 100),
      fieldMetadataUniversalIdentifier: field.entryDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
