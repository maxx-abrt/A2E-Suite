import {
  readMarkdownFileEntry,
  readZipEntries,
  readZipTextEntry,
  textEntryToBytes,
  writeZipEntries,
} from '@/blocknote-editor/import/utils/zipArchiveCodec';
import { zipSync, strToU8 } from 'fflate';

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

  it('preserves genuinely empty exported pages', () => {
    expect(readZipEntries(zipSync({ 'Empty.md': new Uint8Array(0) }))).toEqual([
      { path: 'Empty.md', bytes: new Uint8Array(0) },
    ]);
  });

  it.each([
    '/outside.md',
    '../outside.md',
    'Home/../../outside.md',
    'C:\\outside.md',
    'Home\\..\\outside.md',
  ])('rejects unsafe raw zip path %s before normalization', (path) => {
    expect(() =>
      readZipEntries(zipSync({ [path]: strToU8('content') })),
    ).toThrow('Unsafe archive path');
  });

  it('rejects normalized duplicate paths before the codec can replace a file', () => {
    expect(() =>
      readZipEntries(
        zipSync({
          'Home.md': strToU8('first'),
          './Home.md': strToU8('second'),
        }),
      ),
    ).toThrow('Duplicate archive path');
  });

  it('rejects excessive entry counts even for empty files', () => {
    const files = Object.fromEntries(
      Array.from({ length: 5001 }, (_, index) => [
        `${index}.md`,
        new Uint8Array(0),
      ]),
    );
    expect(() => readZipEntries(zipSync(files))).toThrow(
      'Archive exceeds the import size limit',
    );
  });
});
