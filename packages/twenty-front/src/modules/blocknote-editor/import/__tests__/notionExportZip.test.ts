import { readNotionExportZip } from '@/blocknote-editor/import/utils/notionExportZip';

const encoder = new TextEncoder();

const entry = (path: string, content: string) => ({
  path,
  bytes: encoder.encode(content),
});

const binaryEntry = (path: string) => ({
  path,
  bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
});

describe('readNotionExportZip', () => {
  it('reconstructs the nested page tree from the folder structure', () => {
    const result = readNotionExportZip([
      entry('Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', '# Parent'),
      entry(
        'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Child bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.md',
        'child body',
      ),
      entry(
        'Parent aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Child bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/Grandchild cccccccccccccccccccccccccccccccc.md',
        'grandchild body',
      ),
    ]);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].title).toBe('Parent');
    expect(result.pages[0].children).toHaveLength(1);
    expect(result.pages[0].children[0].title).toBe('Child');
    expect(result.pages[0].children[0].children[0].title).toBe('Grandchild');
    expect(result.pages[0].children[0].children[0].markdown).toBe(
      'grandchild body',
    );
  });

  it('re-attaches images from the page asset folder', () => {
    const result = readNotionExportZip([
      entry('Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', '![cat](photo.png)'),
      binaryEntry('Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/photo.png'),
    ]);

    expect(result.pages[0].images).toHaveLength(1);
    expect(result.pages[0].images[0].fileName).toBe('photo.png');
    expect(result.pages[0].images[0].alt).toBe('cat');
    expect(result.warnings).toHaveLength(0);
  });

  it('resolves a percent-encoded folder-relative image reference', () => {
    const result = readNotionExportZip([
      entry(
        'Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md',
        '![cat](Root%20aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/photo.png)',
      ),
      binaryEntry('Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/photo.png'),
    ]);

    expect(result.pages[0].images).toHaveLength(1);
  });

  it('warns and drops an image that is not in the archive', () => {
    const result = readNotionExportZip([
      entry('Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', '![cat](missing.png)'),
    ]);

    expect(result.pages[0].images).toHaveLength(0);
    expect(result.warnings).toContainEqual({
      kind: 'image-unmapped',
      element: 'missing.png',
    });
  });

  it('warns for an external image instead of calling out to the network', () => {
    const result = readNotionExportZip([
      entry(
        'Root aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md',
        '![remote](https://example.com/a.png)',
      ),
    ]);

    expect(result.warnings).toContainEqual({
      kind: 'image-unmapped',
      element: 'https://example.com/a.png',
    });
  });

  it('strips a single top-level export container folder', () => {
    const result = readNotionExportZip([
      entry(
        'Export aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/Root bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.md',
        'body',
      ),
    ]);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].title).toBe('Root');
  });

  it('falls back to the first heading when the file name has no title', () => {
    const result = readNotionExportZip([
      entry('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md', '# Heading title\nbody'),
    ]);

    expect(result.pages[0].title).toBe('Heading title');
    expect(result.warnings).toContainEqual({
      kind: 'page-title-from-heading',
      element: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.md',
    });
  });
});
