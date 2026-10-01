// Codec-agnostic view of a zip archive used by the Bureau import/export path.
//
// The import walker and the export builder both operate on a flat list of
// `DocumentsTransferEntry` values. Keeping the archive as a plain entry list
// means the conversion logic is unit-testable without a zip runtime and the
// zip codec stays a thin adapter at the edges.

export type DocumentsTransferEntry = {
  path: string;
  bytes: Uint8Array;
};

export const normalizeEntryPath = (path: string): string =>
  path
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/{2,}/g, '/');

export const getEntryDirectory = (path: string): string => {
  const lastSlashIndex = path.lastIndexOf('/');

  return lastSlashIndex === -1 ? '' : path.slice(0, lastSlashIndex);
};

export const getEntryBaseName = (path: string): string => {
  const lastSlashIndex = path.lastIndexOf('/');

  return lastSlashIndex === -1 ? path : path.slice(lastSlashIndex + 1);
};

export const hasMarkdownExtension = (path: string): boolean =>
  /\.(md|markdown)$/i.test(path);

export const isImageEntryPath = (path: string): boolean =>
  /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(path);

export const joinEntryPath = (...segments: string[]): string =>
  segments.filter((segment) => segment !== '').join('/');

// Notion appends a stable 32-hex suffix to every exported page folder/file so
// two pages with the same title don't collide. The title the user sees is the
// name without that suffix.
export const stripNotionEntryHash = (name: string): string => {
  const stripped = name.replace(/\s+[0-9a-f]{32}$/i, '').trim();

  return /^[0-9a-f]{32}$/i.test(stripped) ? '' : stripped;
};

export const decodeEntryTarget = (target: string): string => {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
};

export const isAbsoluteEntryTarget = (target: string): boolean =>
  /^(https?:|data:|mailto:|#)/i.test(target);

// When the archive nests everything under a single top-level folder, that
// folder is an export container, not a page. Returns the prefix to strip.
export const findSingleRootPrefix = (
  entries: readonly DocumentsTransferEntry[],
): string => {
  if (entries.length === 0) {
    return '';
  }

  const firstDirectory = getEntryDirectory(normalizeEntryPath(entries[0].path));

  if (firstDirectory === '') {
    return '';
  }

  const rootSegment = firstDirectory.split('/')[0];

  return entries.every((entry) =>
    normalizeEntryPath(entry.path).startsWith(`${rootSegment}/`),
  )
    ? `${rootSegment}/`
    : '';
};

export const stripEntryRootPrefix = (
  path: string,
  rootPrefix: string,
): string =>
  rootPrefix !== '' && path.startsWith(rootPrefix)
    ? path.slice(rootPrefix.length)
    : path;
