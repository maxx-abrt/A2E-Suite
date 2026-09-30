import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import { i18n } from '@lingui/core';
import { isDefined } from 'twenty-shared/utils';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { type SuggestionItem } from '@/blocknote-editor/types/types';
import { getColumnListBlock } from '@/blocknote-editor/utils/getColumnListBlock';
import {
  SLASH_MENU_CUSTOM_ITEM_DEFINITIONS,
  SLASH_MENU_DEFAULT_ITEM_DEFINITIONS,
  type SlashMenuItemDefinition,
} from '@/blocknote-editor/utils/slashMenuItemDefinitions';
import {
  SLASH_MENU_GROUP_LABELS,
  SLASH_MENU_GROUP_ORDER,
} from '@/blocknote-editor/utils/slashMenuGroups';

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

const localizeDefinition = (
  definition: SlashMenuItemDefinition,
): Pick<
  SuggestionItem,
  'title' | 'aliases' | 'group' | 'groupKey' | 'Icon'
> => ({
  title: i18n._(definition.title),
  aliases: definition.aliases,
  group: i18n._(SLASH_MENU_GROUP_LABELS[definition.groupKey]),
  groupKey: definition.groupKey,
  Icon: definition.Icon,
});

// 2–4 columns: BlockNote ships 2/3 only, and the AC requires four as well.
const COLUMN_LIST_ITEMS: { definitionKey: string; columnCount: number }[] = [
  { definitionKey: 'Two Columns', columnCount: 2 },
  { definitionKey: 'Three Columns', columnCount: 3 },
  { definitionKey: 'Four Columns', columnCount: 4 },
];

const groupIndexByKey = new Map(
  SLASH_MENU_GROUP_ORDER.map((groupKey, index) => [groupKey, index]),
);

// Keeps section order stable while preserving insertion order within a group
// (Array.prototype.sort is stable).
export const sortSlashMenuItemsByGroup = (
  items: SuggestionItem[],
): SuggestionItem[] =>
  [...items].sort(
    (left, right) =>
      (groupIndexByKey.get(left.groupKey ?? 'basic') ?? 0) -
      (groupIndexByKey.get(right.groupKey ?? 'basic') ?? 0),
  );

// Media embeds all insert the same `file` block: FileBlock picks its renderer
// from the uploaded file category (image/video/audio inline, PDF/document as a
// download link) and uploads through the attachments storage. BlockNote's own
// per-type image/video/audio items are dropped by
// DEFAULT_ITEM_TITLES_REPLACED_BY_CUSTOM so there is a single upload path.
const CUSTOM_MEDIA_ITEM_DEFINITION_KEYS = [
  'Image embed',
  'Video embed',
  'Audio embed',
  'PDF embed',
  'File',
];

const DEFAULT_ITEM_TITLES_REPLACED_BY_CUSTOM = new Set([
  'File',
  'Image',
  'Video',
  'Audio',
]);

const insertFileBlock = (editor: BlockEditorInstance) => {
  const currentBlock = editor.getTextCursorPosition().block;

  editor.insertBlocks(
    [
      {
        type: 'file',
        props: {
          url: '',
        },
      },
    ],
    currentBlock,
    'before',
  );
};

export const getSlashMenu = (editor: BlockEditorInstance): SuggestionItem[] => {
  const defaultItems = getDefaultReactSlashMenuItems(editor)
    .filter((item) => !DEFAULT_ITEM_TITLES_REPLACED_BY_CUSTOM.has(item.title))
    .map((item) => {
      const definition = SLASH_MENU_DEFAULT_ITEM_DEFINITIONS[item.title];

      if (!isDefined(definition)) {
        return { ...item, groupKey: 'basic' as const };
      }

      return {
        ...item,
        ...localizeDefinition(definition),
        aliases: [...(item.aliases ?? []), ...definition.aliases],
      };
    });

  const customItems: SuggestionItem[] = [
    {
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS.Callout),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'callout' }),
    },
    {
      ...localizeDefinition(
        SLASH_MENU_CUSTOM_ITEM_DEFINITIONS['Table of Contents'],
      ),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, { type: 'tableOfContents' }),
    },
    {
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS['To-do']),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'todoTask',
          props: { checked: false, taskId: '' },
        }),
    },
    {
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS['Web bookmark']),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'bookmark',
          props: { url: '', title: '', hostname: '' },
        }),
    },
    {
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS['Sub-page']),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'pageLink',
          props: { documentId: '', title: '' },
        }),
    },
    {
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS['Record view']),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'recordView',
          props: { viewId: '', viewName: '', objectMetadataId: '' },
        }),
    },
    ...COLUMN_LIST_ITEMS.map(({ definitionKey, columnCount }) => ({
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS[definitionKey]),
      onItemClick: () =>
        insertOrUpdateBlockForSlashMenu(
          editor,
          getColumnListBlock(columnCount),
        ),
    })),
    ...CUSTOM_MEDIA_ITEM_DEFINITION_KEYS.map((definitionKey) => ({
      ...localizeDefinition(SLASH_MENU_CUSTOM_ITEM_DEFINITIONS[definitionKey]),
      onItemClick: () => insertFileBlock(editor),
    })),
  ];

  return sortSlashMenuItemsByGroup([...defaultItems, ...customItems]);
};
