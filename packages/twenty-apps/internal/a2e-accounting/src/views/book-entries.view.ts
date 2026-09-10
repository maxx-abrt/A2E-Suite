import { defineView, ViewSortDirection } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.bookEntry;
const id = (position: number) => viewFieldId('08', 0, position);

// The ledger view: chronological, with the provenance column visible so a
// machine-written row is never mistaken for a hand-written one.
export default defineView({
  universalIdentifier: VIEW_IDS.bookEntries,
  name: 'Livre — écritures',
  objectUniversalIdentifier: OBJECT_IDS.bookEntry,
  icon: 'IconBook',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.entryDate,
      position: 0,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.label,
      position: 1,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.entryType,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.amount,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.categoryLabel,
      position: 4,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.reference,
      position: 5,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(6),
      fieldMetadataUniversalIdentifier: field.isAuto,
      position: 6,
      isVisible: true,
      size: 120,
    },
  ],
  sorts: [
    {
      universalIdentifier: viewFieldId('08', 0, 100),
      fieldMetadataUniversalIdentifier: field.entryDate,
      direction: ViewSortDirection.DESC,
    },
  ],
});
