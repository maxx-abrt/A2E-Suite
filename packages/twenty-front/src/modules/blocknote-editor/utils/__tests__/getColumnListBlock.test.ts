import { getColumnListBlock } from '@/blocknote-editor/utils/getColumnListBlock';
import { describe, expect, it } from '@jest/globals';

describe('getColumnListBlock', () => {
  it.each([2, 3, 4])('builds a columnList with %i columns', (columnCount) => {
    const block = getColumnListBlock(columnCount);

    expect(block.type).toBe('columnList');
    expect(block.children).toHaveLength(columnCount);

    for (const column of block.children) {
      expect(column.type).toBe('column');
      expect(column.children).toEqual([{ type: 'paragraph' }]);
    }
  });
});
