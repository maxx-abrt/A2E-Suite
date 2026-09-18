import { defineView, ViewOpenRecordIn, ViewType } from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Field metadata ids from src/objects/chat-message.object.ts. Messages carry
// no meaningful sort field the app owns (createdAt is a system field), so the
// view ships unsorted and the chat UI owns chronological paging.
const field = {
  body: 'c31c0300-0001-4000-8000-000000000001',
  editedAt: 'c31c0300-0001-4000-8000-000000000002',
  channel: 'c31c0300-0002-4000-8000-000000000001',
  author: 'c31c0300-0002-4000-8000-000000000004',
};

const fieldId = (position: number) => viewFieldId('03', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allMessages,
  name: 'Tous les messages',
  objectUniversalIdentifier: OBJECT_IDS.message,
  type: ViewType.TABLE,
  icon: 'IconMessage',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.body,
      position: 0,
      isVisible: true,
      size: 320,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.channel,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.author,
      position: 2,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.editedAt,
      position: 3,
      isVisible: true,
      size: 160,
    },
  ],
});
