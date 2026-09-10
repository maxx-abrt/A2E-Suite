// The real editor chain (@blocknote/core dist) cannot be imported under Jest
// (bundled CJS breaks under transform); mock the item provider and test our
// own mapping logic: icon assignment + the custom File item.
import { getSlashMenu } from '@/blocknote-editor/utils/getSlashMenu';
import { describe, expect, it } from '@jest/globals';

jest.mock('@blocknote/react', () => ({
  getDefaultReactSlashMenuItems: jest.fn(() => [
    { title: 'Heading 1', onItemClick: () => undefined },
    { title: 'Quote', onItemClick: () => undefined },
    { title: 'Divider', onItemClick: () => undefined },
    { title: 'Code Block', onItemClick: () => undefined },
  ]),
}));

describe('getSlashMenu', () => {
  const fakeEditor = {} as never;

  it('maps canonical icons onto default items', () => {
    const items = getSlashMenu(fakeEditor);

    const headings = items.find((item) => item.title === 'Heading 1');
    const quote = items.find((item) => item.title === 'Quote');
    const divider = items.find((item) => item.title === 'Divider');
    const codeBlock = items.find((item) => item.title === 'Code Block');

    expect(headings?.Icon).toBeDefined();
    expect(quote?.Icon).toBeDefined();
    expect(divider?.Icon).toBeDefined();
    expect(codeBlock?.Icon).toBeDefined();
  });

  it('appends the custom File item with an upload onItemClick', () => {
    const items = getSlashMenu(fakeEditor);
    const fileItem = items.find((item) => item.title === 'File');

    expect(fileItem).toBeDefined();
    expect(fileItem?.aliases).toContain('file');
    expect(typeof fileItem?.onItemClick).toBe('function');
  });
});
