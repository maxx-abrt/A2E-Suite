import {
  readMarkdownFileEntry,
  readZipEntries,
  readZipTextEntry,
  textEntryToBytes,
  writeZipEntries,
} from '@/blocknote-editor/import/utils/zipArchiveCodec';

describe('zipArchiveCodec', () => {
  it('round-trips entries through a real zip archive', () => {
    const archive = writeZipEntries([
      { path: 'Root.md', bytes: textEntryToBytes('# Root') },
      {
        path: 'Root/photo.png',
        bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      },
    ]);

    const entries = readZipEntries(archive);
    const byPath = new Map(entries.map((entry) => [entry.path, entry]));

    expect([...byPath.keys()].sort()).toEqual(['Root.md', 'Root/photo.png']);
    expect(readZipTextEntry(byPath.get('Root.md')!)).toBe('# Root');
    expect(byPath.get('Root/photo.png')!.bytes).toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );
  });

  it('reads a plain markdown file as a transfer entry', () => {
    const entry = readMarkdownFileEntry('Notes.md', textEntryToBytes('hello'));

    expect(entry.path).toBe('Notes.md');
    expect(readZipTextEntry(entry)).toBe('hello');
  });

  it('drops the synthetic directory marker and empty entries', () => {
    const archive = writeZipEntries([
      { path: 'Root.md', bytes: textEntryToBytes('body') },
    ]);

    const entries = readZipEntries(archive);

    expect(entries.map((entry) => entry.path)).toEqual(['Root.md']);
  });
});
