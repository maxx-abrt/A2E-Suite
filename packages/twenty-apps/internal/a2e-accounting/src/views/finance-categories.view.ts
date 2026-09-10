import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.financeCategory;
const id = (position: number) => viewFieldId('05', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.financeCategories,
  name: 'Catégories',
  objectUniversalIdentifier: OBJECT_IDS.financeCategory,
  icon: 'IconCategory',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.categoryKind,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.pcgAccount,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.defaultVatRate,
      position: 3,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.isArchived,
      position: 4,
      isVisible: true,
      size: 120,
    },
  ],
});
