import { getBlockWordCount } from '@/blocknote-editor/editor-status/utils/getBlockWordCount';

describe('getBlockWordCount', () => {
  it('should return 0 for null input', () => {
    expect(getBlockWordCount(null)).toBe(0);
  });

  it('should return 0 for an empty document', () => {
    expect(getBlockWordCount([])).toBe(0);
  });

  it('should count words across blocks', () => {
    const blocks = [
      { content: [{ text: 'Hello world', type: 'text', styles: {} }] },
      { content: [{ text: 'Second block', type: 'text', styles: {} }] },
    ];

    expect(getBlockWordCount(blocks)).toBe(4);
  });

  it('should count words inside nested children', () => {
    const blocks = [
      {
        content: [{ text: 'Parent', type: 'text', styles: {} }],
        children: [
          { content: [{ text: 'Child words here', type: 'text', styles: {} }] },
        ],
      },
    ];

    expect(getBlockWordCount(blocks)).toBe(4);
  });

  it('should not count empty runs', () => {
    const blocks = [
      { content: [{ text: '', type: 'text', styles: {} }] },
      { content: [{ text: '   ', type: 'text', styles: {} }] },
      { content: [{ text: 'One', type: 'text', styles: {} }] },
    ];

    expect(getBlockWordCount(blocks)).toBe(1);
  });

  it('should handle accented French words', () => {
    const blocks = [
      {
        content: [{ text: 'À propos des émissions', type: 'text', styles: {} }],
      },
    ];

    expect(getBlockWordCount(blocks)).toBe(4);
  });
});
