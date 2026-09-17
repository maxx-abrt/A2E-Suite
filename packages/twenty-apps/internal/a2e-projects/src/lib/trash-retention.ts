// Trash retention policy as data, so the purge cron and the archive/restore
// payloads read the same window. An unparsable archivedAt is never purged: a
// broken timestamp must not silently destroy a project item the member can
// still see in the corbeille. Mirrors a2e-documents' trash-retention.

export const TRASH_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

// Present = the record sits in the corbeille; null/empty = live.
export const isInTrash = (archivedAt: string | undefined | null): boolean => {
  if (typeof archivedAt !== 'string' || archivedAt === '') {
    return false;
  }

  return !Number.isNaN(Date.parse(archivedAt));
};

export const isPastTrashRetention = (
  archivedAt: string | undefined | null,
  now: number = Date.now(),
): boolean => {
  if (typeof archivedAt !== 'string' || archivedAt === '') {
    return false;
  }

  const archivedTime = Date.parse(archivedAt);

  if (Number.isNaN(archivedTime)) {
    return false;
  }

  return now - archivedTime > TRASH_RETENTION_DAYS * DAY_MS;
};

// A record stays restorable while it sits in the corbeille inside the window:
// the archive is readable and the purge deadline has not passed.
export const isRestorable = (
  archivedAt: string | undefined | null,
  now: number = Date.now(),
): boolean => isInTrash(archivedAt) && !isPastTrashRetention(archivedAt, now);

export const buildArchivePayload = (
  now: number = Date.now(),
): { archivedAt: string } => ({ archivedAt: new Date(now).toISOString() });

export const buildRestorePayload = (): { archivedAt: null } => ({
  archivedAt: null,
});
