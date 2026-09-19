import { isDefined } from 'twenty-shared/utils';

import { type DriveFile } from '@/drive/types/DriveRecord';
import { getDriveFileName } from '@/drive/utils/driveFileFilter';
import { getDriveFilePreviewValue } from '@/drive/utils/driveFilePreview';
import { isDriveRecordRestorable } from '@/drive/utils/driveTrash';

// Bulk Drive operations must never let one bad row abort the batch, and the
// caller must receive every failure rather than a single thrown error. The page
// keeps failed rows selected and lists them in a notice, so a partial batch is
// visible instead of silently dropping work.

export type DriveBulkFailureReason = 'download-url-missing' | 'unknown';

export type DriveBulkItem = {
  id: string;
  label: string;
};

export type DriveBulkFailure = {
  id: string;
  label: string;
  reason: DriveBulkFailureReason;
  detail?: string;
};

export type DriveBulkResult = {
  total: number;
  succeededIds: string[];
  failures: DriveBulkFailure[];
};

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error && error.message !== '') {
    return error.message;
  }

  if (typeof error === 'string' && error !== '') {
    return error;
  }

  return undefined;
};

// `action` may return a reason for an expected failure (a file with no
// download URL); a thrown error is recorded as `unknown` with its message kept
// as detail so a localized summary can still be shown.
export const runDriveBulkAction = async <TItem extends DriveBulkItem>({
  items,
  action,
}: {
  items: TItem[];
  action: (
    item: TItem,
  ) => Promise<DriveBulkFailureReason | void> | DriveBulkFailureReason | void;
}): Promise<DriveBulkResult> => {
  const succeededIds: string[] = [];
  const failures: DriveBulkFailure[] = [];

  for (const item of items) {
    try {
      const reason = await action(item);

      if (typeof reason === 'string') {
        failures.push({ id: item.id, label: item.label, reason });
      } else {
        succeededIds.push(item.id);
      }
    } catch (error) {
      const detail = getErrorMessage(error);

      failures.push({
        id: item.id,
        label: item.label,
        reason: 'unknown',
        ...(isDefined(detail) ? { detail } : {}),
      });
    }
  }

  return { total: items.length, succeededIds, failures };
};

export const hasDriveBulkFailures = (result: DriveBulkResult): boolean =>
  result.failures.length > 0;

export const toDriveBulkItem = (
  file: DriveFile,
): DriveBulkItem & { file: DriveFile } => ({
  id: file.id,
  label: getDriveFileName(file),
  file,
});

// Bulk download reads the URL from the same `FieldFilesValue` the preview
// modal uses; a row without one is an expected per-item failure, not a crash.
export const getDriveFileDownloadUrl = (file: DriveFile): string | null =>
  getDriveFilePreviewValue(file)?.url ?? null;

// Undo is only offered while the trash window (the same 7 days the app purge
// cron honours) still allows a restore; past it the action is withdrawn rather
// than failing after the click.
export type DriveBulkUndo = {
  items: DriveBulkItem[];
  archivedAt: string;
};

export const canUndoDriveBulkArchive = (
  undo: DriveBulkUndo | null,
  now: number = Date.now(),
): boolean => isDefined(undo) && isDriveRecordRestorable(undo.archivedAt, now);
