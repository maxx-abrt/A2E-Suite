import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { withMultiColumn } from '@blocknote/xl-multi-column';

import { BookmarkBlock } from '@/blocknote-editor/blocks/BookmarkBlock';
import { CalloutBlock } from '@/blocknote-editor/blocks/CalloutBlock';
import { FileBlock } from '@/blocknote-editor/blocks/FileBlock';
import { MentionInlineContent } from '@/blocknote-editor/blocks/MentionInlineContent';
import { PageLinkBlock } from '@/blocknote-editor/blocks/PageLinkBlock';
import { TableOfContentsBlock } from '@/blocknote-editor/blocks/TableOfContentsBlock';
import { TodoTaskBlock } from '@/blocknote-editor/blocks/TodoTaskBlock';

// `withMultiColumn` augments the schema with the `column`/`columnList` blocks
// so the slash menu can split the page into 2–4 columns.
export const BLOCK_SCHEMA = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      callout: CalloutBlock(),
      file: FileBlock(),
      tableOfContents: TableOfContentsBlock(),
      todoTask: TodoTaskBlock(),
      bookmark: BookmarkBlock(),
      pageLink: PageLinkBlock(),
    },
    inlineContentSpecs: {
      ...defaultInlineContentSpecs,
      mention: MentionInlineContent,
    },
  }),
);
