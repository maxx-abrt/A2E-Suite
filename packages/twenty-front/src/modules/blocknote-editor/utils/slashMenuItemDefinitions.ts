import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import {
  type IconComponent,
  IconAlertCircle,
  IconBlockquote,
  IconCode,
  IconColumns,
  IconFile,
  IconH1,
  IconH2,
  IconH3,
  IconH4,
  IconH5,
  IconH6,
  IconHeadphones,
  IconList,
  IconListCheck,
  IconListDetails,
  IconListNumbers,
  IconListSearch,
  IconMinus,
  IconMoodSmile,
  IconPhoto,
  IconPilcrow,
  IconTable,
  IconVideo,
  IconArrowsSplit2,
} from 'twenty-ui/icon';

import { type SlashMenuGroupKey } from '@/blocknote-editor/utils/slashMenuGroups';

export type SlashMenuItemDefinition = {
  title: MessageDescriptor;
  // French aliases (plus a few English extras): the default BlockNote item
  // already carries the English aliases, so search works in fr+en.
  aliases: string[];
  groupKey: SlashMenuGroupKey;
  Icon: IconComponent;
};

// Keyed by the default BlockNote English title returned by
// `getDefaultReactSlashMenuItems`; the title is replaced with the localized one
// and the group is remapped to our sections.
export const SLASH_MENU_DEFAULT_ITEM_DEFINITIONS: Record<
  string,
  SlashMenuItemDefinition
> = {
  'Heading 1': {
    title: msg`Heading 1`,
    aliases: ['titre 1', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH1,
  },
  'Heading 2': {
    title: msg`Heading 2`,
    aliases: ['titre 2', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH2,
  },
  'Heading 3': {
    title: msg`Heading 3`,
    aliases: ['titre 3', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH3,
  },
  'Heading 4': {
    title: msg`Heading 4`,
    aliases: ['titre 4', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH4,
  },
  'Heading 5': {
    title: msg`Heading 5`,
    aliases: ['titre 5', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH5,
  },
  'Heading 6': {
    title: msg`Heading 6`,
    aliases: ['titre 6', 'titre', 'title'],
    groupKey: 'basic',
    Icon: IconH6,
  },
  'Toggle Heading 1': {
    title: msg`Heading 1 (toggle)`,
    aliases: ['titre 1 dépliable', 'titre repliable', 'titre'],
    groupKey: 'basic',
    Icon: IconH1,
  },
  'Toggle Heading 2': {
    title: msg`Heading 2 (toggle)`,
    aliases: ['titre 2 dépliable', 'titre repliable', 'titre'],
    groupKey: 'basic',
    Icon: IconH2,
  },
  'Toggle Heading 3': {
    title: msg`Heading 3 (toggle)`,
    aliases: ['titre 3 dépliable', 'titre repliable', 'titre'],
    groupKey: 'basic',
    Icon: IconH3,
  },
  Paragraph: {
    title: msg`Paragraph`,
    aliases: ['paragraphe', 'texte'],
    groupKey: 'basic',
    Icon: IconPilcrow,
  },
  Quote: {
    title: msg`Quote`,
    aliases: ['citation', 'citation bloc', 'blockquote'],
    groupKey: 'basic',
    Icon: IconBlockquote,
  },
  'Toggle List': {
    title: msg`Toggle list`,
    aliases: ['liste dépliable', 'liste repliable', 'liste'],
    groupKey: 'basic',
    Icon: IconListDetails,
  },
  'Numbered List': {
    title: msg`Numbered list`,
    aliases: ['liste numérotée', 'liste ordonnée', 'liste'],
    groupKey: 'basic',
    Icon: IconListNumbers,
  },
  'Bullet List': {
    title: msg`Bullet list`,
    aliases: ['liste à puces', 'puces', 'liste'],
    groupKey: 'basic',
    Icon: IconList,
  },
  'Check List': {
    title: msg`Check list`,
    aliases: ['liste de tâches', 'cases à cocher', 'todo'],
    groupKey: 'basic',
    Icon: IconListCheck,
  },
  'Code Block': {
    title: msg`Code block`,
    aliases: ['bloc de code', 'code'],
    groupKey: 'basic',
    Icon: IconCode,
  },
  Table: {
    title: msg`Table`,
    aliases: ['tableau'],
    groupKey: 'basic',
    Icon: IconTable,
  },
  Divider: {
    title: msg`Divider`,
    aliases: ['séparateur', 'ligne'],
    groupKey: 'basic',
    Icon: IconMinus,
  },
  'Page Break': {
    title: msg`Page break`,
    aliases: ['saut de page', 'page'],
    groupKey: 'basic',
    Icon: IconArrowsSplit2,
  },
  Image: {
    title: msg`Image`,
    aliases: ['image', 'photo'],
    groupKey: 'media',
    Icon: IconPhoto,
  },
  Video: {
    title: msg`Video`,
    aliases: ['vidéo', 'film'],
    groupKey: 'media',
    Icon: IconVideo,
  },
  Audio: {
    title: msg`Audio`,
    aliases: ['audio', 'son'],
    groupKey: 'media',
    Icon: IconHeadphones,
  },
  Emoji: {
    title: msg`Emoji`,
    aliases: ['émoji', 'émoticône'],
    groupKey: 'media',
    Icon: IconMoodSmile,
  },
};

// Items US-121 adds on top of BlockNote's defaults (Bureau callout, columns,
// table of contents).
export const SLASH_MENU_CUSTOM_ITEM_DEFINITIONS: Record<
  string,
  SlashMenuItemDefinition
> = {
  Callout: {
    title: msg`Callout`,
    aliases: ['encadré', 'note', 'avertissement'],
    groupKey: 'bureau',
    Icon: IconAlertCircle,
  },
  File: {
    title: msg`File`,
    aliases: ['fichier', 'pièce jointe', 'attachment'],
    groupKey: 'media',
    Icon: IconFile,
  },
  'Table of Contents': {
    title: msg`Table of contents`,
    aliases: ['table des matières', 'sommaire', 'toc'],
    groupKey: 'basic',
    Icon: IconListSearch,
  },
  'Two Columns': {
    title: msg`Two columns`,
    aliases: ['deux colonnes', 'colonnes', 'colonne'],
    groupKey: 'basic',
    Icon: IconColumns,
  },
  'Three Columns': {
    title: msg`Three columns`,
    aliases: ['trois colonnes', 'colonnes', 'colonne'],
    groupKey: 'basic',
    Icon: IconColumns,
  },
  'Four Columns': {
    title: msg`Four columns`,
    aliases: ['quatre colonnes', 'colonnes', 'colonne'],
    groupKey: 'basic',
    Icon: IconColumns,
  },
};
