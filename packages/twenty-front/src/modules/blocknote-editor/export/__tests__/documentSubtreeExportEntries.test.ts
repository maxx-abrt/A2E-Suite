import {
  buildDocumentSubtreeExportEntries,
  type DocumentExportNode,
} from '@/blocknote-editor/export/utils/documentSubtreeExportEntries';
import { slugifyExportFileName } from '@/blocknote-editor/export/utils/exportBlocksToMarkdown';
import { readNotionExportZip } from '@/blocknote-editor/import/utils/notionExportZip';

const encoder = new TextEncoder();

const node = (
  overrides: Partial<DocumentExportNode> &
    Pick<DocumentExportNode, 'id' | 'title' | 'markdown'>,
): DocumentExportNode => ({
  images: [],
  children: [],
  ...overrides,
});

describe('buildDocumentSubtreeExportEntries', () => {
  it('writes one markdown file per page, nested under the parent asset folder', () => {
    const entries = buildDocumentSubtreeExportEntries(
      node({
        id: 'root',
        title: 'Root Page',
        markdown: '# Root',
        children: [
          node({ id: 'child', title: 'Child Page', markdown: 'child body' }),
        ],
      }),
    );

    expect(entries.map((entry) => entry.path)).toEqual([
      'root-page.md',
      'root-page/child-page.md',
    ]);
  });

  it('places image bytes in the page asset folder and rewrites the reference', () => {
    const entries = buildDocumentSubtreeExportEntries(
      node({
        id: 'root',
        title: 'Root',
        markdown: '![hero](hero.png)',
        images: [{ fileName: 'hero.png', bytes: encoder.encode('png') }],
      }),
    );

    const markdownEntry = entries.find((entry) => entry.path === 'root.md');

    expect(new TextDecoder().decode(markdownEntry?.bytes)).toBe(
      '![hero](root/hero.png)',
    );
    expect(entries.map((entry) => entry.path)).toContain('root/hero.png');
  });

  it('disambiguates sibling pages that slugify to the same name', () => {
    const entries = buildDocumentSubtreeExportEntries(
      node({
        id: 'root',
        title: 'Root',
        markdown: 'root',
        children: [
          node({ id: 'a', title: 'Notes', markdown: 'a' }),
          node({ id: 'b', title: 'Notes', markdown: 'b' }),
        ],
      }),
    );

    expect(entries.map((entry) => entry.path).sort()).toEqual([
      'root.md',
      'root/notes-2.md',
      'root/notes.md',
    ]);
  });

  it('round-trips through the Notion zip reader to an equivalent tree', () => {
    const exported = buildDocumentSubtreeExportEntries(
      node({
        id: 'root',
        title: 'Root Page',
        markdown: '![hero](hero.png)',
        images: [{ fileName: 'hero.png', bytes: encoder.encode('png') }],
        children: [
          node({ id: 'child', title: 'Child Page', markdown: 'child' }),
        ],
      }),
    );

    const read = readNotionExportZip(exported);

    expect(read.pages).toHaveLength(1);
    expect(read.pages[0].title).toBe(slugifyExportFileName('Root Page'));
    expect(read.pages[0].images.map((image) => image.fileName)).toEqual([
      'hero.png',
    ]);
    expect(read.pages[0].children.map((child) => child.title)).toEqual([
      slugifyExportFileName('Child Page'),
    ]);
    expect(read.warnings).toHaveLength(0);
  });
});
