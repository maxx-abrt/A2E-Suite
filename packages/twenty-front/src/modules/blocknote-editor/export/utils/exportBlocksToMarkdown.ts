import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { isDefined } from 'twenty-shared/utils';

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

// Markdown export uses the editor's own lossy converter: callouts/toggles
// degrade to plain paragraphs. v1 accepts this; the DOCX path is the
// fidelity route.
export const exportBlocksToMarkdown = async (
  editor: BlockEditorInstance,
): Promise<string> => {
  const markdown = await editor.blocksToMarkdownLossy(editor.document);

  return markdown;
};

export const triggerFileDownload = (
  content: string | Blob,
  fileName: string,
  mimeType: string,
): void => {
  const blob = isDefined(content)
    ? content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType })
    : new Blob([], { type: mimeType });

  const downloadUrl = URL.createObjectURL(blob);
  const anchorElement = document.createElement('a');

  anchorElement.href = downloadUrl;
  anchorElement.download = fileName;
  anchorElement.click();

  URL.revokeObjectURL(downloadUrl);
};

export const slugifyExportFileName = (title: string): string =>
  title
    .normalize('NFD')
    // eslint-disable-next-line unicorn/escape-case, regexp/no-obsolete-unicode-property
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document';
