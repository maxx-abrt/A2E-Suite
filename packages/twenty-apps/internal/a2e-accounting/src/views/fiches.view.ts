import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.fiche;
const id = (position: number) => viewFieldId('09', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.fiches,
  name: 'Fiches officielles',
  objectUniversalIdentifier: OBJECT_IDS.fiche,
  icon: 'IconFileCertificate',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.title,
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.templateKey,
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.status,
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
      fieldMetadataUniversalIdentifier: field.amountRequested,
      position: 4,
      isVisible: true,
      size: 140,
    },
  ],
});
