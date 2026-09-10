import { defineView, ViewSortDirection } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.subvention;
const id = (position: number) => viewFieldId('0b', 0, position);

// The catalogue as a plain Twenty table: search, filters and sorting come for
// free, so the app only ships the extra reasoning the table cannot do.
export default defineView({
  universalIdentifier: VIEW_IDS.subventions,
  name: 'Catalogue de subventions',
  objectUniversalIdentifier: OBJECT_IDS.subvention,
  icon: 'IconAward',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.title,
      position: 0,
      isVisible: true,
      size: 360,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.submissionDeadline,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.audiences,
      position: 2,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.perimeterScale,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.source,
      position: 4,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.isCallForProject,
      position: 5,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(6),
      fieldMetadataUniversalIdentifier: field.rateMax,
      position: 6,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: id(7),
      fieldMetadataUniversalIdentifier: field.isLive,
      position: 7,
      isVisible: true,
      size: 100,
    },
  ],
  sorts: [
    {
      universalIdentifier: viewFieldId('0b', 0, 100),
      fieldMetadataUniversalIdentifier: field.submissionDeadline,
      direction: ViewSortDirection.ASC,
    },
  ],
});
