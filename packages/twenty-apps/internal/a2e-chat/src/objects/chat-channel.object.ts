import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  channelKindOptions,
  channelPostingRoleOptions,
  channelVisibilityOptions,
  oneToMany,
} from '../constants/field-vocabulary.ts';
import {
  LABEL_IDENTIFIER_IDS,
  OBJECT_IDS,
  RELATION_IDS,
} from '../constants/universal-identifiers.ts';

// A chat channel. `kind` scopes it (workspace-wide, project, or a custom
// topic), `visibility` gates discovery, and `postingRoles` lists which
// member roles may post. Membership is the channelMember junction; a channel
// with no channelMember rows is workspace-visible only (public channels).
export default defineObject({
  universalIdentifier: OBJECT_IDS.channel,
  nameSingular: 'chatChannel',
  namePlural: 'chatChannels',
  labelSingular: 'Canal',
  labelPlural: 'Canaux',
  description:
    'Canal de discussion natif : espace de travail, projet ou sujet à la demande.',
  icon: 'IconMessages',
  labelIdentifierFieldMetadataUniversalIdentifier:
    LABEL_IDENTIFIER_IDS.channelName,
  fields: [
    {
      universalIdentifier: LABEL_IDENTIFIER_IDS.channelName,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nom',
      icon: 'IconAbc',
      defaultValue: "''",
    },
    {
      universalIdentifier: 'c31c0100-0001-4000-8000-000000000002',
      type: FieldType.SELECT,
      name: 'kind',
      label: 'Type',
      icon: 'IconCategory',
      defaultValue: `'WORKSPACE'`,
      options: channelKindOptions,
    },
    {
      universalIdentifier: 'c31c0100-0001-4000-8000-000000000003',
      type: FieldType.SELECT,
      name: 'visibility',
      label: 'Visibilité',
      icon: 'IconLock',
      defaultValue: `'PUBLIC'`,
      options: channelVisibilityOptions,
    },
    {
      universalIdentifier: 'c31c0100-0001-4000-8000-000000000004',
      type: FieldType.TEXT,
      name: 'topic',
      label: 'Sujet',
      description: 'Résumé affiché en en-tête du canal',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      // MULTI_SELECT: a channel can allow several roles to post. Default is
      // every member; admins-only is MEMBER-cleared.
      universalIdentifier: 'c31c0100-0001-4000-8000-000000000005',
      type: FieldType.MULTI_SELECT,
      name: 'postingRoles',
      label: 'Rôles autorisés à publier',
      icon: 'IconUsers',
      defaultValue: ["'MEMBER'", "'ADMIN'"],
      options: channelPostingRoleOptions,
    },
    {
      universalIdentifier: RELATION_IDS.channelMessages,
      type: FieldType.RELATION,
      name: 'messages',
      label: 'Messages',
      icon: 'IconMessage',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.message,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.messageChannel,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.channelMembers,
      type: FieldType.RELATION,
      name: 'members',
      label: 'Membres',
      icon: 'IconUsers',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.channelMember,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.channelMemberChannel,
      universalSettings: oneToMany,
    },
    {
      universalIdentifier: RELATION_IDS.channelReadCursors,
      type: FieldType.RELATION,
      name: 'readCursors',
      label: 'Compteurs de lecture',
      icon: 'IconEye',
      relationTargetObjectMetadataUniversalIdentifier: OBJECT_IDS.readCursor,
      relationTargetFieldMetadataUniversalIdentifier:
        RELATION_IDS.readCursorChannel,
      universalSettings: oneToMany,
    },
  ],
});
