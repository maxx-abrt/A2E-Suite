import {
  slugifyExportFileName,
  triggerFileDownload,
} from '@/blocknote-editor/export/utils/exportBlocksToMarkdown';

describe('slugifyExportFileName', () => {
  it('should slugify accents, spaces and punctuation', () => {
    expect(slugifyExportFileName('ÉéÉé Étude des émissions — 2026')).toBe(
      'eeee-etude-des-emissions-2026',
    );
  });

  it('should collapse duplicate separators', () => {
    expect(slugifyExportFileName('a -- b///c')).toBe('a-b-c');
  });

  it('should fall back to "document" when nothing is usable', () => {
    expect(slugifyExportFileName('---')).toBe('document');
    expect(slugifyExportFileName('')).toBe('document');
  });
});

describe('triggerFileDownload', () => {
  it('should create an object URL and click an anchor', () => {
    const createdObjectUrls: string[] = [];

    const originalCreateObjectUrl = URL.createObjectURL;
    const originalRevokeObjectUrl = URL.revokeObjectURL;

    URL.createObjectURL = ((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      const url = `blob:mock-${createdObjectUrls.length}`;

      createdObjectUrls.push(url);

      return url;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    triggerFileDownload('# Title', 'doc.md', 'text/markdown');

    expect(createdObjectUrls).toHaveLength(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });
});
