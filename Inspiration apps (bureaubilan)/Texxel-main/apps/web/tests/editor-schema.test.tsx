import { describe, it, expect } from 'vitest';
import { BlockNoteEditor } from '@blocknote/core';
import { fluxEditorSchema } from '@/lib/editor-schema';

describe('editor-schema', () => {
  it('should create BlockNoteEditor with fluxEditorSchema', () => {
    const editor = BlockNoteEditor.create({
      schema: fluxEditorSchema,
      initialContent: [{ type: 'paragraph', content: 'Test' }],
    });

    expect(editor).toBeDefined();
    expect(editor.schema).toBe(fluxEditorSchema);
  });

  it('should include custom blocks: chart, database, mathBlock, diagram, columnList, column', () => {
    const blockTypes = Object.keys(fluxEditorSchema.blockSpecs);

    expect(blockTypes).toContain('chart');
    expect(blockTypes).toContain('database');
    expect(blockTypes).toContain('mathBlock');
    expect(blockTypes).toContain('diagram');
    expect(blockTypes).toContain('columnList');
    expect(blockTypes).toContain('column');
  });

  it('should include custom inline content: mention, math', () => {
    const inlineTypes = Object.keys(fluxEditorSchema.inlineContentSpecs);

    expect(inlineTypes).toContain('mention');
    expect(inlineTypes).toContain('math');
  });

  it('should include custom styles: font, insertion, deletion, modification', () => {
    const styleTypes = Object.keys(fluxEditorSchema.styleSpecs);

    expect(styleTypes).toContain('font');
    expect(styleTypes).toContain('insertion');
    expect(styleTypes).toContain('deletion');
    expect(styleTypes).toContain('modification');
  });
});
