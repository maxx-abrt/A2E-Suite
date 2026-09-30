// The real editor chain (@blocknote/core dist) cannot be imported under Jest
// (bundled CJS breaks under transform); mock the item provider and test our
// own mapping logic: localization, grouping, structural custom items.
import {
  getSlashMenu,
  sortSlashMenuItemsByGroup,
} from '@/blocknote-editor/utils/getSlashMenu';
import { describe, expect, it } from '@jest/globals';

jest.mock('@blocknote/core/extensions', () => ({
  insertOrUpdateBlockForSlashMenu: jest.fn(),
}));

jest.mock('@blocknote/react', () => ({
  getDefaultReactSlashMenuItems: jest.fn(() => [
    {
      title: 'Heading 1',
      aliases: ['h1', 'heading1'],
      onItemClick: () => undefined,
    },
    {
      title: 'Toggle Heading 1',
      aliases: ['h1', 'collapsable'],
      onItemClick: () => undefined,
    },
    { title: 'Paragraph', aliases: ['text'], onItemClick: () => undefined },
    { title: 'Quote', aliases: ['quotation'], onItemClick: () => undefined },
    {
      title: 'Toggle List',
      aliases: ['toggleList'],
      onItemClick: () => undefined,
    },
    { title: 'Divider', aliases: ['hr'], onItemClick: () => undefined },
    { title: 'Code Block', aliases: ['code'], onItemClick: () => undefined },
    { title: 'Table', aliases: ['table'], onItemClick: () => undefined },
    { title: 'Image', aliases: ['img'], onItemClick: () => undefined },
    { title: 'File', aliases: ['file'], onItemClick: () => undefined },
    { title: 'Unknown Future Block', onItemClick: () => undefined },
  ]),
}));

describe('getSlashMenu', () => {
  const fakeEditor = {} as never;

  it('maps canonical icons and groups onto default items', () => {
    const items = getSlashMenu(fakeEditor);

    const heading = items.find((item) => item.title === 'Heading 1');
    const quote = items.find((item) => item.title === 'Quote');
    const divider = items.find((item) => item.title === 'Divider');
    const codeBlock = items.find((item) => item.title === 'Code block');
    const table = items.find((item) => item.title === 'Table');

    expect(heading?.Icon).toBeDefined();
    expect(quote?.Icon).toBeDefined();
    expect(divider?.Icon).toBeDefined();
    expect(codeBlock?.Icon).toBeDefined();
    expect(table?.Icon).toBeDefined();

    expect(heading?.groupKey).toBe('basic');
    expect(quote?.groupKey).toBe('basic');
  });

  it('keeps French aliases so the menu is searchable in fr+en', () => {
    const items = getSlashMenu(fakeEditor);

    const table = items.find((item) => item.title === 'Table');
    const quote = items.find((item) => item.title === 'Quote');

    expect(table?.aliases).toContain('tableau');
    expect(quote?.aliases).toContain('citation');
  });

  it('appends the columns 2–4, table of contents, callout and file items', () => {
    const items = getSlashMenu(fakeEditor);

    const titles = items.map((item) => item.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        'Two columns',
        'Three columns',
        'Four columns',
        'Table of contents',
        'Callout',
        'File',
      ]),
    );

    const tableOfContents = items.find(
      (item) => item.title === 'Table of contents',
    );
    const callout = items.find((item) => item.title === 'Callout');
    const file = items.find((item) => item.title === 'File');

    expect(tableOfContents?.groupKey).toBe('basic');
    expect(callout?.groupKey).toBe('bureau');
    expect(file?.groupKey).toBe('media');
    expect(typeof file?.onItemClick).toBe('function');
  });

  it('appends the interactive/linking items and their groups', () => {
    const items = getSlashMenu(fakeEditor);

    const todo = items.find((item) => item.title === 'To-do');
    const bookmark = items.find((item) => item.title === 'Web bookmark');
    const subPage = items.find((item) => item.title === 'Sub-page');
    const imageEmbed = items.find((item) => item.title === 'Image embed');

    expect(todo?.groupKey).toBe('bureau');
    expect(bookmark?.groupKey).toBe('links');
    expect(subPage?.groupKey).toBe('links');
    expect(imageEmbed?.groupKey).toBe('media');

    for (const item of [todo, bookmark, subPage, imageEmbed]) {
      expect(typeof item?.onItemClick).toBe('function');
    }

    // French aliases keep the new items searchable in fr.
    expect(todo?.aliases).toContain('tâche');
    expect(bookmark?.aliases).toContain('signet');
    expect(subPage?.aliases).toContain('sous-page');
  });

  it('appends the embedded record view item in the Bureau group', () => {
    const items = getSlashMenu(fakeEditor);

    const recordView = items.find((item) => item.title === 'Record view');

    expect(recordView?.groupKey).toBe('bureau');
    expect(typeof recordView?.onItemClick).toBe('function');
    expect(recordView?.aliases).toContain('base de données');
  });

  it('replaces the default Image/Video/Audio items with FileBlock-backed ones', () => {
    const items = getSlashMenu(fakeEditor);

    expect(items.find((item) => item.title === 'Image')).toBeUndefined();
    expect(items.find((item) => item.title === 'Image embed')).toBeDefined();
  });

  it('preserves unknown default items in the basic group', () => {
    const items = getSlashMenu(fakeEditor);

    const unknown = items.find((item) => item.title === 'Unknown Future Block');

    expect(unknown).toBeDefined();
    expect(unknown?.groupKey).toBe('basic');
  });

  it('orders groups by the fixed section order', () => {
    const items = sortSlashMenuItemsByGroup([
      { title: 'link', groupKey: 'links', onItemClick: () => undefined },
      { title: 'image', groupKey: 'media', onItemClick: () => undefined },
      { title: 'heading', groupKey: 'basic', onItemClick: () => undefined },
      { title: 'callout', groupKey: 'bureau', onItemClick: () => undefined },
    ]);

    expect(items.map((item) => item.groupKey)).toEqual([
      'basic',
      'media',
      'bureau',
      'links',
    ]);
  });
});
