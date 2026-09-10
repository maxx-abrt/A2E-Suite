import { defineView, ViewSortDirection } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.savedSubvention;
const id = (position: number) => viewFieldId('0c', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.savedSubventions,
  name: 'Mes dossiers de subvention',
  objectUniversalIdentifier: OBJECT_IDS.savedSubvention,
  icon: 'IconFolders',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 320,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.status,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.deadline,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.amountRequested,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.amountGranted,
      position: 4,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.aiScore,
      position: 5,
      isVisible: true,
      size: 120,
    },
  ],
  sorts: [
    {
      universalIdentifier: viewFieldId('0c', 0, 100),
      fieldMetadataUniversalIdentifier: field.deadline,
      direction: ViewSortDirection.ASC,
    },
  ],
});
