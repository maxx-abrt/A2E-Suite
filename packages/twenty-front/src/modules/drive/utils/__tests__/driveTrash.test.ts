import {
  DRIVE_TRASH_RETENTION_DAYS,
  isDriveRecordInTrash,
  isDriveRecordRestorable,
  isPastDriveTrashRetention,
} from '@/drive/utils/driveTrash';

const NOW = Date.parse('2026-09-17T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

describe('driveTrash', () => {
  it('uses the same 7-day window as the app purge cron', () => {
    expect(DRIVE_TRASH_RETENTION_DAYS).toBe(7);
  });

  it('treats a live record as not in the corbeille', () => {
    expect(isDriveRecordInTrash(null)).toBe(false);
    expect(isDriveRecordInTrash('')).toBe(false);
    expect(isDriveRecordInTrash('not-a-date')).toBe(false);
  });

  it('detects an archived record', () => {
    expect(isDriveRecordInTrash('2026-09-10T11:00:00.000Z')).toBe(true);
  });

  it('marks an archive older than 7 days as past retention', () => {
    expect(
      isPastDriveTrashRetention(new Date(NOW - 8 * DAY_MS).toISOString(), NOW),
    ).toBe(true);
    expect(
      isPastDriveTrashRetention(new Date(NOW - DAY_MS).toISOString(), NOW),
    ).toBe(false);
  });

  it('only allows restoring inside the window', () => {
    expect(
      isDriveRecordRestorable(new Date(NOW - DAY_MS).toISOString(), NOW),
    ).toBe(true);
    expect(
      isDriveRecordRestorable(new Date(NOW - 8 * DAY_MS).toISOString(), NOW),
    ).toBe(false);
    expect(isDriveRecordRestorable(null, NOW)).toBe(false);
  });
});
