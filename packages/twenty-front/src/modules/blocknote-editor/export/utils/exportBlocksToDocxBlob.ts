import {
  DOCXExporter,
  docxDefaultSchemaMappings,
} from '@blocknote/xl-docx-exporter';

import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

type ExporterWithBlob = {
  toBlob: (blocks: unknown[]) => Promise<Blob>;
};

// The default mappings are typed against blocknote's default schema; our
// BLOCK_SCHEMA extends it with extra specs, and the generic variance makes
// the direct assignment fail even though every default block still maps.
// The runtime export path is unchanged by the widening.
const createDocxExporter = (
  schema: ConstructorParameters<typeof DOCXExporter>[0],
): ExporterWithBlob =>
  new DOCXExporter(
    schema as never,
    docxDefaultSchemaMappings as never,
  ) as unknown as ExporterWithBlob;

export const exportBlocksToDocxBlob = async (
  editor: BlockEditorInstance,
): Promise<Blob> => {
  const docxExporter = createDocxExporter(editor.schema as never);

  const blob = await docxExporter.toBlob(editor.document as unknown[]);

  return blob;
};
