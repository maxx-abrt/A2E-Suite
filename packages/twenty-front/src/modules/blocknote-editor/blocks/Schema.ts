import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';

import { CalloutBlock } from '@/blocknote-editor/blocks/CalloutBlock';
import { FileBlock } from '@/blocknote-editor/blocks/FileBlock';
import { MentionInlineContent } from '@/blocknote-editor/blocks/MentionInlineContent';

export const BLOCK_SCHEMA = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: CalloutBlock(),
    file: FileBlock(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: MentionInlineContent,
  },
});
