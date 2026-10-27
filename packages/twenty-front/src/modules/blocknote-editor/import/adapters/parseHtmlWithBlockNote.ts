import { BlockNoteEditor } from '@blocknote/core';

import { BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { prepareNotionHtml } from '@/blocknote-editor/import/utils/prepareNotionHtml';
import { mapImportedAttachmentsAndLinks } from '@/blocknote-editor/import/utils/mapImportedAttachmentsAndLinks';
import { marked } from 'marked';

// Real parser adapter for `importHtmlToDocument`. It reuses BlockNote's own
// HTML parser (no parallel converter) and is kept out of the pure pipeline so
// unit tests never load the editor runtime.
const createDocumentEditor = () =>
  BlockNoteEditor.create({ schema: BLOCK_SCHEMA });

type DocumentBlockNoteEditor = ReturnType<typeof createDocumentEditor>;

let sharedDocumentEditor: DocumentBlockNoteEditor | undefined;

export const parseHtmlWithBlockNote = (html: string): readonly unknown[] => {
  sharedDocumentEditor ??= createDocumentEditor();

  const prepared = prepareNotionHtml(html);
  return mapImportedAttachmentsAndLinks(
    sharedDocumentEditor.tryParseHTMLToBlocks(prepared.html),
    {
      resolveAttachmentUrl: prepared.restoreUrl,
      resolveLinkUrl: prepared.restoreUrl,
      allowArchiveRelativeUrls: true,
    },
  ).blocks;
};

export const parseMarkdownWithBlockNote = (
  markdown: string,
): readonly unknown[] => {
  // Markdown exports may contain HTML callouts; use the same structural bridge.
  return parseHtmlWithBlockNote(
    marked.parse(markdown, { async: false, gfm: true }),
  );
};

export const importedBlocksToMarkdown = async (
  blocks: readonly unknown[],
): Promise<string> => {
  sharedDocumentEditor ??= createDocumentEditor();
  return sharedDocumentEditor.blocksToMarkdownLossy(
    blocks as (typeof BLOCK_SCHEMA.PartialBlock)[],
  );
};
