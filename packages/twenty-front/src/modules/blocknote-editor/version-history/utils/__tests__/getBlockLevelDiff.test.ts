import { getBlockLevelDiff } from '@/blocknote-editor/version-history/utils/getBlockLevelDiff';

describe('getBlockLevelDiff', () => {
  it('should return no entries for identical documents', () => {
    const blocks = [
      { id: 'b1', type: 'paragraph', content: [{ text: 'Hello' }] },
    ];

    expect(getBlockLevelDiff(blocks, blocks)).toEqual([]);
  });

  it('should flag added blocks', () => {
    const entries = getBlockLevelDiff(null, [
      { id: 'b1', type: 'paragraph', content: [{ text: 'New' }] },
    ]);

    expect(entries).toEqual([
      {
        blockId: 'b1',
        blockType: 'paragraph',
        status: 'added',
        nextText: 'New',
      },
    ]);
  });

  it('should flag removed blocks', () => {
    const entries = getBlockLevelDiff(
      [{ id: 'b1', type: 'paragraph', content: [{ text: 'Gone' }] }],
      null,
    );

    expect(entries).toEqual([
      {
        blockId: 'b1',
        blockType: 'paragraph',
        status: 'removed',
        previousText: 'Gone',
      },
    ]);
  });

  it('should flag text edits as changed', () => {
    const entries = getBlockLevelDiff(
      [{ id: 'b1', type: 'paragraph', content: [{ text: 'Old text' }] }],
      [{ id: 'b1', type: 'paragraph', content: [{ text: 'New text' }] }],
    );

    expect(entries).toEqual([
      {
        blockId: 'b1',
        blockType: 'paragraph',
        status: 'changed',
        previousText: 'Old text',
        nextText: 'New text',
      },
    ]);
  });

  it('should flag type changes even with identical text', () => {
    const entries = getBlockLevelDiff(
      [{ id: 'b1', type: 'paragraph', content: [{ text: 'Same' }] }],
      // Real blocknote heading blocks carry props; the extra key must not
      // break the structural diff inputs.
      [
        {
          id: 'b1',
          type: 'heading',
          props: { level: 1 },
          content: [{ text: 'Old text' }],
        } as { id: string; type: string; content: { text: string }[] },
      ],
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe('changed');
    expect(entries[0].blockType).toBe('heading');
  });
});
