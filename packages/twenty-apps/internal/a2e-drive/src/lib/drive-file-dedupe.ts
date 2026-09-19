// Deterministic Drive duplicate grouping (P9.2 dedupe-hints).
//
// The standard `attachment` object carries NO byte size and no content hash
// (phase-06-report P6.2 note), so this deliberately compares only the
// normalized file name + extension: no size/hash pretence. The key also
// carries the containing folder when the attachment has one, so the same file
// uploaded to two folders is reported as two groups rather than a false
// duplicate. Groups with a single member are not hints and are dropped.

export type DriveDedupeFile = {
  id: string;
  name: string | null;
  folderId: string | null;
};

export type DriveDuplicateGroup = {
  normalizedName: string;
  extension: string;
  folderId: string | null;
  recordIds: string[];
};

export type DriveDedupeResult = {
  groups: DriveDuplicateGroup[];
  duplicateFileCount: number;
  scannedFileCount: number;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

// Lowercase, trim and collapse internal whitespace so "Invoice  final.PDF" and
// "invoice final.pdf" land in one group. The extension is split off the last
// dot; "archive.tar.gz" keeps base "archive.tar" + extension "gz", which is the
// same rule the Drive page uses to classify a file.
export const normalizeDriveFileName = (
  name: string | null | undefined,
): { base: string; extension: string } | null => {
  if (!hasText(name)) {
    return null;
  }

  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const lastDotIndex = normalized.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) {
    return { base: normalized, extension: '' };
  }

  return {
    base: normalized.slice(0, lastDotIndex),
    extension: normalized.slice(lastDotIndex + 1),
  };
};

const buildGroupKey = (
  base: string,
  extension: string,
  folderId: string | null,
): string => JSON.stringify([base, extension, folderId]);

export const groupDriveDuplicates = ({
  files,
}: {
  files: DriveDedupeFile[];
}): DriveDedupeResult => {
  const buckets = new Map<string, DriveDuplicateGroup>();

  for (const file of files) {
    const parsed = normalizeDriveFileName(file.name);

    if (parsed === null) {
      continue;
    }

    const folderId = file.folderId ?? null;
    const key = buildGroupKey(parsed.base, parsed.extension, folderId);
    const bucket = buckets.get(key) ?? {
      normalizedName: parsed.base,
      extension: parsed.extension,
      folderId,
      recordIds: [],
    };

    bucket.recordIds.push(file.id);
    buckets.set(key, bucket);
  }

  const groups = [...buckets.values()]
    .filter((group) => group.recordIds.length >= 2)
    .map((group) => ({
      ...group,
      recordIds: [...group.recordIds].sort((left, right) =>
        left.localeCompare(right),
      ),
    }))
    .sort((left, right) => {
      const byName = left.normalizedName.localeCompare(right.normalizedName);

      if (byName !== 0) {
        return byName;
      }

      const byExtension = left.extension.localeCompare(right.extension);

      if (byExtension !== 0) {
        return byExtension;
      }

      return (left.folderId ?? '').localeCompare(right.folderId ?? '');
    });

  return {
    groups,
    duplicateFileCount: groups.reduce(
      (total, group) => total + group.recordIds.length,
      0,
    ),
    scannedFileCount: files.length,
  };
};
