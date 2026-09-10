import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.orgProfile;
const id = (position: number) => viewFieldId('0a', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.orgProfiles,
  name: 'Identité de la structure',
  objectUniversalIdentifier: OBJECT_IDS.orgProfile,
  icon: 'IconBuildingCommunity',
  position: 0,
  fields: [
    {
      universalIdentifier: id(0),
      fieldMetadataUniversalIdentifier: field.legalName,
      position: 0,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: id(1),
      fieldMetadataUniversalIdentifier: field.structureKind,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.siret,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.rna,
      position: 3,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.vatMode,
      position: 4,
      isVisible: true,
      size: 160,
    },
  ],
});
