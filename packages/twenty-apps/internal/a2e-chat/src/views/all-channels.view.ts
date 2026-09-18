import {
  defineView,
  ViewOpenRecordIn,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Field metadata ids from src/objects/chat-channel.object.ts, kept here as
// view data (views reference fields by universal identifier only).
const field = {
  name: 'c31c0100-0001-4000-8000-000000000001',
  kind: 'c31c0100-0001-4000-8000-000000000002',
  visibility: 'c31c0100-0001-4000-8000-000000000003',
  topic: 'c31c0100-0001-4000-8000-000000000004',
};

const fieldId = (position: number) => viewFieldId('01', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allChannels,
  name: 'Tous les canaux',
  objectUniversalIdentifier: OBJECT_IDS.channel,
  type: ViewType.TABLE,
  icon: 'IconMessages',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.name,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.kind,
      position: 1,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.visibility,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.topic,
      position: 3,
      isVisible: true,
      size: 280,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'c31c0100-0006-4000-8000-000000000001',
      fieldMetadataUniversalIdentifier: field.name,
      direction: ViewSortDirection.ASC,
    },
  ],
});
