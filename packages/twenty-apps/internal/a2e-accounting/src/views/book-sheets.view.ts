import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.bookSheet;
const id = (position: number) => viewFieldId('07', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.bookSheets,
  name: 'Livres',
  objectUniversalIdentifier: OBJECT_IDS.bookSheet,
  icon: 'IconNotebook',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.sheetKind,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.isDefault,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.fiscalYear,
      position: 3,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.isLocked,
      position: 4,
      isVisible: true,
      size: 120,
    },
  ],
});
