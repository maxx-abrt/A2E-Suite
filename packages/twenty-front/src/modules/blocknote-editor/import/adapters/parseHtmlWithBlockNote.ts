import { BlockNoteEditor } from '@blocknote/core';

import { BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';

// Real parser adapter for `importHtmlToDocument`. It reuses BlockNote's own
// HTML parser (no parallel converter) and is kept out of the pure pipeline so
// unit tests never load the editor runtime.
const createDocumentEditor = () =>
  BlockNoteEditor.create({ schema: BLOCK_SCHEMA });

type DocumentBlockNoteEditor = ReturnType<typeof createDocumentEditor>;

let sharedDocumentEditor: DocumentBlockNoteEditor | undefined;

export const parseHtmlWithBlockNote = (html: string): readonly unknown[] => {
  sharedDocumentEditor ??= createDocumentEditor();

  return sharedDocumentEditor.tryParseHTMLToBlocks(html);
};
