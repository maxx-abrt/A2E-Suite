import { defineView, ViewOpenRecordIn, ViewType } from 'twenty-sdk/define';

import {
  OBJECT_IDS,
  VIEW_IDS,
  viewFieldId,
} from '../constants/universal-identifiers.ts';

// Field metadata ids from src/objects/chat-channel-member.object.ts.
const field = {
  memberRole: 'c31c0200-0001-4000-8000-000000000001',
  joinedAt: 'c31c0200-0001-4000-8000-000000000002',
  channel: 'c31c0200-0002-4000-8000-000000000001',
  workspaceMember: 'c31c0200-0002-4000-8000-000000000002',
};

const fieldId = (position: number) => viewFieldId('02', 0, position);

export default defineView({
  universalIdentifier: VIEW_IDS.allChannelMembers,
  name: 'Membres des canaux',
  objectUniversalIdentifier: OBJECT_IDS.channelMember,
  type: ViewType.TABLE,
  icon: 'IconUsers',
  position: 0,
  openRecordIn: ViewOpenRecordIn.SIDE_PANEL,
  fields: [
    {
      universalIdentifier: fieldId(0),
      fieldMetadataUniversalIdentifier: field.channel,
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: fieldId(1),
      fieldMetadataUniversalIdentifier: field.workspaceMember,
      position: 1,
      isVisible: true,
      size: 180,
    },
    {
      universalIdentifier: fieldId(2),
      fieldMetadataUniversalIdentifier: field.memberRole,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: fieldId(3),
      fieldMetadataUniversalIdentifier: field.joinedAt,
      position: 3,
      isVisible: true,
      size: 160,
    },
  ],
});
