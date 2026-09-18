import { validateHtmlImportForCreate } from '@/blocknote-editor/import/utils/validateHtmlImportForCreate';

describe('validateHtmlImportForCreate', () => {
  it('accepts a non-empty import with blocks', () => {
    const validation = validateHtmlImportForCreate({
      sanitizedHtml: '<h1>Title</h1>',
      blocks: [{ type: 'heading' }],
    });

    expect(validation).toEqual({ valid: true, reasons: [] });
  });

  it('rejects an empty import', () => {
    const validation = validateHtmlImportForCreate({
      sanitizedHtml: '   ',
      blocks: [],
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons).toContain('empty-import');
    expect(validation.reasons).toContain('no-importable-blocks');
  });

  it('rejects when parsing produced no importable blocks', () => {
    const validation = validateHtmlImportForCreate({
      sanitizedHtml: '<p></p>',
      blocks: [],
    });

    expect(validation.reasons).toEqual(['no-importable-blocks']);
  });

  it('rejects residual unsafe markup fail-closed', () => {
    const validation = validateHtmlImportForCreate({
      sanitizedHtml: '<p>a</p><script>alert(1)</script>',
      blocks: [{ type: 'paragraph' }],
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons).toEqual(['unsafe-residue']);
  });
});
