import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { manyToOne, oneToMany } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// A message posted in a channel. `body` is Markdown-lite text; threads are
// the self-relation threadParent/threadReplies. The system deletedAt field
// (auto-provisioned on every metadata object) carries the message tombstone,
// so an edited message keeps editedAt while a deleted one soft-deletes.
// Visibility is NOT stored per message: a message is readable by anyone who
// can read its channel (channel membership + role), so private channels do
// not leak through a direct message record.
export default defineObject({
  universalIdentifier: OBJECT_IDS.message,
  nameSingular: 'chatMessage',
  namePlural: 'chatMessages',
  labelSingular: 'Message',
  labelPlural: 'Messages',
  description:
    'Message de canal (texte Markdown-lite), avec fils et réactions.',
  icon: 'IconMessage',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.messageBody,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.messageBody,
      type: FieldType.TEXT,
      name: 'body',
      label: 'Contenu',
      description: 'Texte du message (Markdown-lite)',
      icon: 'IconMessage',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31c0300-0001-4000-8000-000000000002',
      type: FieldType.DATE_TIME,
      name: 'editedAt',
      label: 'Modifié le',
      description: 'Renseigné à la première édition du message',
      icon: 'IconPencil',
      isNullable: true,
    },
    {
      universalIdentifier: RELATION_IDS.messageChannel,
      type: FieldType.RELATION,
      name: 'channel',
      label: 'Canal',
      icon: 'IconMessages',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channel,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.channelMessages,
      universalSettings: {
        ...manyToOne('channelId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.messageAuthor,
      type: FieldType.RELATION,
      name: 'author',
      label: 'Auteur',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberMessages,
      universalSettings: {
        ...manyToOne('authorId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.threadParent,
      type: FieldType.RELATION,
      name: 'threadParent',
      label: 'Message parent',
      description: 'Message dont celui-ci est une réponse de fil',
      icon: 'IconHierarchy',
      isNullable: true,
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.threadReplies,
      universalSettings: {
        ...manyToOne('threadParentId'),
        onDelete: OnDeleteAction.SET_NULL,
      },
    },
    {
      universalIdentifier: RELATION_IDS.threadReplies,
      type: FieldType.RELATION,
      name: 'threadReplies',
      label: 'Réponses de fil',
      icon: 'IconHierarchy',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
      relationTargetFieldMetadataUniversalIdentifier: RELATION_IDS.threadParent,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.messageReactions,
      type: FieldType.RELATION,
      name: 'reactions',
      label: 'Réactions',
      icon: 'IconMoodSmile',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.reaction,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.reactionMessage,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.messageReadCursors,
      type: FieldType.RELATION,
      name: 'readCursors',
      label: 'Compteurs de lecture',
      icon: 'IconEye',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.readCursor,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.readCursorLastMessage,
      universalSettings: oneToMany,
    },
  ],
});
