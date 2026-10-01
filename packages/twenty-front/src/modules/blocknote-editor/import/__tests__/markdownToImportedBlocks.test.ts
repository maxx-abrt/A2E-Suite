import {
  markdownToImportedBlocks,
  parseMarkdownInline,
} from '@/blocknote-editor/import/utils/markdownToImportedBlocks';

const blockTypes = (markdown: string) =>
  markdownToImportedBlocks(markdown).map((block) => block.type);

describe('markdownToImportedBlocks', () => {
  it('maps each heading level to a heading block', () => {
    const blocks = markdownToImportedBlocks('# One\n## Two\n###### Six');

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'heading',
      'heading',
    ]);
    expect(blocks.map((block) => block.props.level)).toEqual([1, 2, 6]);
  });

  it('maps bullet, numbered and task lists', () => {
    expect(blockTypes('- first\n- second')).toEqual([
      'bulletListItem',
      'bulletListItem',
    ]);
    expect(blockTypes('1. first\n2. second')).toEqual([
      'numberedListItem',
      'numberedListItem',
    ]);

    const tasks = markdownToImportedBlocks('- [ ] todo\n- [x] done');

    expect(tasks.map((block) => block.type)).toEqual([
      'checkListItem',
      'checkListItem',
    ]);
    expect(tasks.map((block) => block.props.checked)).toEqual([false, true]);
  });

  it('maps fenced code blocks with their language and body', () => {
    const blocks = markdownToImportedBlocks(
      '```typescript\nconst a = 1;\n```\n',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('codeBlock');
    expect(blocks[0].props.language).toBe('typescript');
    expect(blocks[0].content).toEqual([
      { type: 'text', text: 'const a = 1;', styles: {} },
    ]);
  });

  it('folds an unlabelled fence into the text language', () => {
    const blocks = markdownToImportedBlocks('```\nplain\n```');

    expect(blocks[0].props.language).toBe('text');
  });

  it('maps blockquotes, joining consecutive quote lines', () => {
    const blocks = markdownToImportedBlocks('> line one\n> line two');

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('quote');
    expect(blocks[0].content).toEqual([
      { type: 'text', text: 'line one\nline two', styles: {} },
    ]);
  });

  it('maps image blocks with url and caption and a divider', () => {
    const image = markdownToImportedBlocks('![a cat](cat.png)')[0];

    expect(image.type).toBe('image');
    expect(image.props.url).toBe('cat.png');
    expect(image.props.caption).toBe('a cat');

    expect(blockTypes('---')).toEqual(['divider']);
  });

  it('degrades an unsupported construct to a paragraph', () => {
    const blocks = markdownToImportedBlocks('| a | b |\n| - | - |');

    expect(blocks.map((block) => block.type)).toEqual([
      'paragraph',
      'paragraph',
    ]);
  });

  it('converts inline emphasis, code and links', () => {
    expect(parseMarkdownInline('plain **bold** *italic* `code`')).toEqual([
      { type: 'text', text: 'plain ', styles: {} },
      { type: 'text', text: 'bold', styles: { bold: true } },
      { type: 'text', text: ' ', styles: {} },
      { type: 'text', text: 'italic', styles: { italic: true } },
      { type: 'text', text: ' ', styles: {} },
      { type: 'text', text: 'code', styles: { code: true } },
    ]);

    expect(parseMarkdownInline('see [docs](https://example.com)')).toEqual([
      { type: 'text', text: 'see ', styles: {} },
      {
        type: 'link',
        href: 'https://example.com',
        content: [{ type: 'text', text: 'docs', styles: {} }],
      },
    ]);
  });

  it('keeps emphasis inside a code span literal', () => {
    expect(parseMarkdownInline('`**not bold**`')).toEqual([
      { type: 'text', text: '**not bold**', styles: { code: true } },
    ]);
  });
});
