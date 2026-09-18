import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  channelMemberRoleOptions,
  manyToOne,
} from '../constants/field-vocabulary.ts';
import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// The channel × workspaceMember junction that implements "channel members" —
// the SDK has no many-to-many primitive; this mirrors projectMember
// (P4.1). Private-channel access is decided by the presence of these rows.
export default defineObject({
  universalIdentifier: OBJECT_IDS.channelMember,
  nameSingular: 'chatChannelMember',
  namePlural: 'chatChannelMembers',
  labelSingular: 'Membre de canal',
  labelPlural: 'Membres de canal',
  description: 'Appartenance d’un membre à un canal, avec son rôle.',
  icon: 'IconUsers',
  fields: [
    {
      universalIdentifier: 'c31c0200-0001-4000-8000-000000000001',
      type: FieldType.SELECT,
      name: 'memberRole',
      label: 'Rôle',
      icon: 'IconUser',
      defaultValue: `'MEMBER'`,
      options: channelMemberRoleOptions,
    },
    {
      universalIdentifier: 'c31c0200-0001-4000-8000-000000000002',
      type: FieldType.DATE_TIME,
      name: 'joinedAt',
      label: 'Rejoint le',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.channelMemberChannel,
      type: FieldType.RELATION,
      name: 'channel',
      label: 'Canal',
      icon: 'IconMessages',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channel,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.channelMembers,
      universalSettings: {
        ...manyToOne('membershipChannelId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.channelMemberWorkspaceMember,
      type: FieldType.RELATION,
      name: 'workspaceMember',
      label: 'Membre',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberChannelMemberships,
      universalSettings: {
        ...manyToOne('membershipWorkspaceMemberId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
