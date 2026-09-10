import { defineView } from 'twenty-sdk/define';

import { FIELD_IDS } from '../constants/field-identifiers.ts';
import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

const field = FIELD_IDS.subventionSource;
const id = (position: number) => viewFieldId('0d', 0, position);

// The ingest logbook: what ran, when, how much it wrote, and why it failed.
export default defineView({
  universalIdentifier: VIEW_IDS.subventionSources,
  name: 'Sources du catalogue',
  objectUniversalIdentifier: OBJECT_IDS.subventionSource,
  icon: 'IconDatabase',
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
      fieldMetadataUniversalIdentifier: field.isEnabled,
      position: 1,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: id(2),
      fieldMetadataUniversalIdentifier: field.lastRunStatus,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: id(3),
      fieldMetadataUniversalIdentifier: field.lastSuccessAt,
      position: 3,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: id(4),
      fieldMetadataUniversalIdentifier: field.itemsTotal,
      position: 4,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: id(5),
      fieldMetadataUniversalIdentifier: field.itemsIngested,
      position: 5,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: id(6),
      fieldMetadataUniversalIdentifier: field.itemsUpdated,
      position: 6,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: id(7),
      fieldMetadataUniversalIdentifier: field.lastError,
      position: 7,
      isVisible: true,
      size: 240,
    },
  ],
});
