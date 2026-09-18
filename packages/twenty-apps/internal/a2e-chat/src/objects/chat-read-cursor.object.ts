import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// Per-(channel, member) read position. lastReadMessage is the newest message
// the member has seen; unread counts derive from messages after it. This is
// the durable cursor the realtime read events update (P5.1-realtime), never a
// per-socket sequence number.
export default defineObject({
  universalIdentifier: OBJECT_IDS.readCursor,
  nameSingular: 'chatReadCursor',
  namePlural: 'chatReadCursors',
  labelSingular: 'Curseur de lecture',
  labelPlural: 'Curseurs de lecture',
  description:
    'Dernier message lu par un membre dans un canal (compteur de non-lus).',
  icon: 'IconEye',
  fields: [
    {
      universalIdentifier: 'c31c0500-0001-4000-8000-000000000001',
      type: FieldType.DATE_TIME,
      name: 'lastReadAt',
      label: 'Lu le',
      description: 'Horodatage de la dernière lecture du canal',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.readCursorChannel,
      type: FieldType.RELATION,
      name: 'channel',
      label: 'Canal',
      icon: 'IconMessages',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channel,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.channelReadCursors,
      universalSettings: {
        ...manyToOne('readCursorChannelId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.readCursorWorkspaceMember,
      type: FieldType.RELATION,
      name: 'workspaceMember',
      label: 'Membre',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberReadCursors,
      universalSettings: {
        ...manyToOne('readCursorWorkspaceMemberId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.readCursorLastMessage,
      type: FieldType.RELATION,
      name: 'lastReadMessage',
      label: 'Dernier message lu',
      icon: 'IconMessage',
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.messageReadCursors,
      universalSettings: {
        ...manyToOne('lastReadMessageId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
  ],
});
