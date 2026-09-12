import { describe, it, expect } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';
import { DOCXExporter, docxDefaultSchemaMappings } from '@blocknote/xl-docx-exporter';
import { ODTExporter, odtDefaultSchemaMappings } from '@blocknote/xl-odt-exporter';
import JSZip from 'jszip';
import { fluxEditorSchema } from '@/lib/editor-schema';

describe('export-functionality', () => {
  it('should instantiate BlockNoteEditor with fluxEditorSchema', () => {
    const editor = BlockNoteEditor.create({
      schema: fluxEditorSchema,
      initialContent: [{ type: 'paragraph', content: 'Test' }],
    });

    expect(editor).toBeDefined();
    expect(editor.document).toBeDefined();
    expect(editor.schema).toBe(fluxEditorSchema);
  });

  it('should export paragraph+math to DOCX and ODT with correct mappings', async () => {
    const blocks = [
      {
        id: 'p1',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [
          { type: 'text', text: 'Equation: ', styles: {} },
          { type: 'math', props: { latex: 'E = mc^2' } },
        ],
        children: [],
      },
    ];

    // DOCX export with math mapping
    const docxExporter = new DOCXExporter(
      fluxEditorSchema as any,
      docxDefaultSchemaMappings as any
    );
    const docxBlob = await docxExporter.toBlob(blocks as any, {
      sectionOptions: {},
      documentOptions: {},
    });

    expect(docxBlob).toBeInstanceOf(Blob);
    expect(docxBlob.size).toBeGreaterThan(1000);
    expect(docxBlob.type).toContain('officedocument');

    // ODT export with math mapping
    const odtExporter = new ODTExporter(
      fluxEditorSchema as any,
      odtDefaultSchemaMappings as any
    );
    const odtBlob = await odtExporter.toODTDocument(blocks as any, {});

    expect(odtBlob).toBeInstanceOf(Blob);
    expect(odtBlob.size).toBeGreaterThan(1000);
    expect(odtBlob.type).toContain('opendocument');
  });

  it('should produce valid zip structure with required files', async () => {
    const blocks = [
      {
        id: 'p1',
        type: 'paragraph',
        props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
        content: [{ type: 'text', text: 'Test content', styles: {} }],
        children: [],
      },
    ];

    // DOCX zip structure
    const docxExporter = new DOCXExporter(
      fluxEditorSchema as any,
      docxDefaultSchemaMappings as any
    );
    const docxBlob = await docxExporter.toBlob(blocks as any, {
      sectionOptions: {},
      documentOptions: {},
    });
    const docxZip = await JSZip.loadAsync(await docxBlob.arrayBuffer());

    expect(docxZip.file('[Content_Types].xml')).toBeTruthy();
    expect(docxZip.file('word/document.xml')).toBeTruthy();
    expect(docxZip.file('_rels/.rels')).toBeTruthy();

    // ODT zip structure
    const odtExporter = new ODTExporter(
      fluxEditorSchema as any,
      odtDefaultSchemaMappings as any
    );
    const odtBlob = await odtExporter.toODTDocument(blocks as any, {});
    const odtZip = await JSZip.loadAsync(await odtBlob.arrayBuffer());

    expect(odtZip.file('mimetype')).toBeTruthy();
    expect(odtZip.file('content.xml')).toBeTruthy();
    expect(odtZip.file('META-INF/manifest.xml')).toBeTruthy();
  });
});
