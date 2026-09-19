// Trash retention policy as data, so the archive/restore payloads, the trash
// UI and the purge cron read the same window. An unparsable archivedAt never
// purges: a broken timestamp must not silently destroy a document the user can
// still see in trash. The same 7-day rule is mirrored by a2e-projects (P4.3)
// and a2e-drive (P6) — one window, never a second scheme.

export const TRASH_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// Present and parsable = the document sits in the corbeille; null/empty = live.
// A type predicate, so callers narrow to a parsable timestamp in one step.
export const isInTrash = (
  archivedAt: string | undefined | null,
): archivedAt is string => {
  if (typeof archivedAt !== 'string' || archivedAt === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(archivedAt));
};

export const isPastTrashRetention = (
  archivedAt: string | undefined | null,
  now: number = Date.now(),
): boolean => {
  if (!isInTrash(archivedAt)) {
    return false;
  }

  return now - Date.parse(archivedAt) > TRASH_RETENTION_DAYS * DAY_MS;
};

// A document stays restorable while it sits in the corbeille inside the
// window: the archive is readable and the purge deadline has not passed.
export const isRestorable = (
  archivedAt: string | undefined | null,
  now: number = Date.now(),
): boolean => isInTrash(archivedAt) && !isPastTrashRetention(archivedAt, now);

export const buildArchivePayload = (
  now: number = Date.now(),
): { archivedAt: string } => ({ archivedAt: new Date(now).toISOString() });

// Restore clears the marker, so a restored document is neither in trash nor
// purge-eligible on the next sweep.
export const buildRestorePayload = (): { archivedAt: null } => ({
  archivedAt: null,
});
