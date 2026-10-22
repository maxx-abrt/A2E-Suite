import {
  type DocumentsTransferEntry,
  normalizeEntryPath,
} from '@/blocknote-editor/import/utils/documentsTransferEntries';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

// Thin zip runtime adapter around `fflate`. The import walker and the export
// builder only ever see `DocumentsTransferEntry` values, so the zip library is
// isolated here: swapping codecs (or faking one in tests) cannot leak into the
// conversion logic.

const isDirectoryEntryName = (path: string): boolean => path.endsWith('/');

const MAX_ARCHIVE_ENTRIES = 5000;
const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;

export const readZipEntries = (
  archive: Uint8Array,
): DocumentsTransferEntry[] => {
  let entryCount = 0;
  let totalBytes = 0;
  const unzipped = unzipSync(archive, {
    filter: (entry) => {
      entryCount += 1;
      totalBytes += entry.originalSize;
      if (
        entryCount > MAX_ARCHIVE_ENTRIES ||
        totalBytes > MAX_UNCOMPRESSED_BYTES
      ) {
        throw new Error('Archive exceeds the import size limit');
      }
      return true;
    },
  });

  return Object.entries(unzipped)
    .filter(
      ([path, bytes]) => !isDirectoryEntryName(path) && bytes.byteLength > 0,
    )
    .map(([path, bytes]) => ({
      path: normalizeEntryPath(path),
      bytes,
    }));
};

export const writeZipEntries = (
  entries: readonly DocumentsTransferEntry[],
): Uint8Array => {
  const zippable: Record<string, Uint8Array> = {
    // A file entry markered with a trailing slash makes fflate emit the explicit
    // folder record, so empty asset folders survive an unzip round-trip.
    '/': new Uint8Array(0),
  };

  for (const entry of entries) {
    const path = normalizeEntryPath(entry.path);

    zippable[path] = entry.bytes;
  }

  return zipSync(zippable, { level: 6 });
};

export const readMarkdownFileEntry = (
  fileName: string,
  bytes: Uint8Array,
): DocumentsTransferEntry => ({
  path: normalizeEntryPath(fileName),
  bytes,
});

export const readZipTextEntry = (entry: DocumentsTransferEntry): string =>
  strFromU8(entry.bytes);

export const textEntryToBytes = (text: string): Uint8Array => strToU8(text);
