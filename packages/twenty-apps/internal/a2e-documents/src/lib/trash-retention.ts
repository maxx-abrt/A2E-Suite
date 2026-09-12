// Trash retention policy as data, so the cron and any future UI badge read
// the same number. An unparsable archivedAt never purges: a broken timestamp
// must not silently destroy a document the user can still see in trash.

export const TRASH_RETENTION_DAYS = 7;

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

  return now - archivedTime > TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
};
