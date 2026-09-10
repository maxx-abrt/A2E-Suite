import { getBlockOutline } from '@/blocknote-editor/editor-status/utils/getBlockOutline';

describe('getBlockOutline', () => {
  it('should return an empty array for null input', () => {
    expect(getBlockOutline(null)).toEqual([]);
  });

  it('should return an empty array when there are no headings', () => {
    const blocks = [
      { id: 'block-1', type: 'paragraph', content: [{ text: 'Hello' }] },
    ];

    expect(getBlockOutline(blocks)).toEqual([]);
  });

  it('should extract headings with their level and text', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 1 },
        content: [{ text: 'Introduction', type: 'text', styles: {} }],
      },
      { id: 'block-2', type: 'paragraph', content: [{ text: 'Body' }] },
      {
        id: 'heading-2',
        type: 'heading',
        props: { level: 3 },
        content: [{ text: 'Details', type: 'text', styles: {} }],
      },
    ];

    expect(getBlockOutline(blocks)).toEqual([
      { blockId: 'heading-1', level: 1, text: 'Introduction' },
      { blockId: 'heading-2', level: 3, text: 'Details' },
    ]);
  });

  it('should extract nested headings inside children (toggle blocks)', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 1 },
        content: [{ text: 'Chapter', type: 'text', styles: {} }],
        children: [
          {
            id: 'heading-2',
            type: 'heading',
            props: { level: 2 },
            content: [{ text: 'Section', type: 'text', styles: {} }],
          },
        ],
      },
    ];

    expect(getBlockOutline(blocks)).toEqual([
      { blockId: 'heading-1', level: 1, text: 'Chapter' },
      { blockId: 'heading-2', level: 2, text: 'Section' },
    ]);
  });

  it('should combine multiple text runs of a heading', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 2 },
        content: [
          { text: 'Bold ', type: 'text', styles: { bold: true } },
          { text: 'Title', type: 'text', styles: {} },
        ],
      },
    ];

    expect(getBlockOutline(blocks)).toEqual([
      { blockId: 'heading-1', level: 2, text: 'Bold Title' },
    ]);
  });

  it('should default to level 1 for headings without a numeric level', () => {
    const blocks = [
      {
        id: 'heading-1',
        type: 'heading',
        content: [{ text: 'No level', type: 'text', styles: {} }],
      },
    ];

    expect(getBlockOutline(blocks)).toEqual([
      { blockId: 'heading-1', level: 1, text: 'No level' },
    ]);
  });
});
