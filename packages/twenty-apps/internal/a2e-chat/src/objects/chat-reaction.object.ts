import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { manyToOne } from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// A single emoji reaction by one member on one message. The (message, member,
// emoji) triple is the natural key; duplicate-prevention is enforced by the
// reaction service, not a DB unique index (the metadata layer allows
// duplicates across re-installs).
export default defineObject({
  universalIdentifier: OBJECT_IDS.reaction,
  nameSingular: 'chatReaction',
  namePlural: 'chatReactions',
  labelSingular: 'Réaction',
  labelPlural: 'Réactions',
  description: 'Réaction emoji d’un membre sur un message.',
  icon: 'IconMoodSmile',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.reactionEmoji,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.reactionEmoji,
      type: FieldType.TEXT,
      name: 'emoji',
      label: 'Emoji',
      icon: 'IconMoodSmile',
      defaultValue: "''",
    },
    {
      universalIdentifier: RELATION_IDS.reactionMessage,
      type: FieldType.RELATION,
      name: 'message',
      label: 'Message',
      icon: 'IconMessage',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.messageReactions,
      universalSettings: {
        ...manyToOne('reactionMessageId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
    {
      universalIdentifier: RELATION_IDS.reactionWorkspaceMember,
      type: FieldType.RELATION,
      name: 'workspaceMember',
      label: 'Membre',
      icon: 'IconUser',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember
          .universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.workspaceMemberReactions,
      universalSettings: {
        ...manyToOne('reactionWorkspaceMemberId'),
        onDelete: OnDeleteAction.CASCADE,
      },
    },
  ],
});
