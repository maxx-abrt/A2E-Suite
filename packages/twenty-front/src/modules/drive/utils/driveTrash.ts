// Trash predicates for the Drive browser. The authoritative 7-day window and
// purge live server-side in a2e-drive (`lib/drive-trash-retention.ts`) and its
// purge-drive-trash cron; the browser only needs to know whether a row is in
// the corbeille and whether it is still inside the restore window, so it
// mirrors the same constant rather than inventing a second window.

export const DRIVE_TRASH_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const isDriveRecordInTrash = (
  archivedAt: string | null | undefined,
): boolean => {
  if (typeof archivedAt !== 'string' || archivedAt === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(archivedAt));
};

export const isPastDriveTrashRetention = (
  archivedAt: string | null | undefined,
  now: number = Date.now(),
): boolean => {
  if (!isDriveRecordInTrash(archivedAt)) {
    return false;
  }

  return (
    now - Date.parse(archivedAt as string) > DRIVE_TRASH_RETENTION_DAYS * DAY_MS
  );
};

export const isDriveRecordRestorable = (
  archivedAt: string | null | undefined,
  now: number = Date.now(),
): boolean =>
  isDriveRecordInTrash(archivedAt) &&
  !isPastDriveTrashRetention(archivedAt, now);
