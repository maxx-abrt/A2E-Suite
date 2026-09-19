import {
  groupDriveDuplicates,
  type DriveDedupeFile,
  type DriveDuplicateGroup,
} from '../../lib/drive-file-dedupe.ts';
import {
  coreClient,
  readDriveAttachments,
  readOptionalToolFilter,
  type CoreClientLike,
} from './drive-tool-support.ts';

// READ-ONLY DUPLICATE HINTS (P9.2 dedupe-hints).
//
// The assistant flags likely duplicate uploads by grouped normalized
// name + extension (and folder, when the file has one). `attachment` carries
// no byte size and no content hash, so no size/hash comparison is attempted
// (phase-06-report P6.2). The handler only reads through the caller-context
// Core API client and never moves, renames or deletes anything (C6).

export type DedupeHintsInput = {
  folderId?: string;
};

export type DedupeHintsStatus = 'OK' | 'INVALID_INPUT';

export type DedupeHintsResult = {
  status: DedupeHintsStatus;
  folderId: string | null;
  groups: DriveDuplicateGroup[];
  duplicateFileCount: number;
  scannedFileCount: number;
};

export const buildDedupeHints = async (
  input: DedupeHintsInput,
  client: CoreClientLike = coreClient(),
): Promise<DedupeHintsResult> => {
  const folderId = readOptionalToolFilter(input.folderId);

  if (!folderId.valid) {
    return {
      status: 'INVALID_INPUT',
      folderId: null,
      groups: [],
      duplicateFileCount: 0,
      scannedFileCount: 0,
    };
  }

  const records = await readDriveAttachments(client);
  const scoped =
    folderId.value === null
      ? records
      : records.filter((record) => record.folderId === folderId.value);
  const files: DriveDedupeFile[] = scoped.map((record) => ({
    id: record.id,
    name: record.name,
    folderId: record.folderId,
  }));

  return {
    status: 'OK',
    folderId: folderId.value,
    ...groupDriveDuplicates({ files }),
  };
};
