import { type DriveFile } from '@/drive/types/DriveRecord';
import { buildDriveUsageSummary } from '@/drive/utils/driveUsage';

const buildFile = (
  overrides: Partial<DriveFile> & Pick<DriveFile, 'id'>,
): DriveFile => ({
  name: null,
  folderId: null,
  starred: false,
  sourceApp: null,
  description: null,
  archivedAt: null,
  targetTaskId: null,
  targetNoteId: null,
  targetPersonId: null,
  targetCompanyId: null,
  targetOpportunityId: null,
  targetDashboardId: null,
  targetWorkflowId: null,
  ...overrides,
});

describe('buildDriveUsageSummary', () => {
  const files: DriveFile[] = [
    buildFile({ id: 'a', name: 'contract.pdf' }),
    buildFile({ id: 'b', name: 'report.pdf', sourceApp: 'drive' }),
    buildFile({ id: 'c', name: 'logo.png', sourceApp: 'chat' }),
    buildFile({ id: 'd', name: 'budget.xlsx', targetTaskId: 'task-1' }),
  ];

  it('aggregates by type and by source app, sorted by count then key', () => {
    const summary = buildDriveUsageSummary({ files });

    expect(summary.totalFiles).toBe(4);
    expect(summary.byCategory).toEqual([
      { key: 'TEXT_DOCUMENT', count: 2 },
      { key: 'IMAGE', count: 1 },
      { key: 'SPREADSHEET', count: 1 },
    ]);
    expect(summary.bySourceApp).toEqual([
      { key: 'chat', count: 1 },
      { key: 'crm', count: 1 },
      { key: 'drive', count: 1 },
      { key: 'unknown', count: 1 },
    ]);
  });

  it('leaves quota null when billing provides no limit', () => {
    expect(buildDriveUsageSummary({ files }).quota).toBeNull();
    expect(
      buildDriveUsageSummary({ files, quota: { limitFiles: null } }).quota,
    ).toBeNull();
  });

  it('computes remaining and a clamped percentage when a limit is given', () => {
    expect(
      buildDriveUsageSummary({ files, quota: { limitFiles: 10 } }).quota,
    ).toEqual({
      limitFiles: 10,
      usedFiles: 4,
      remainingFiles: 6,
      percentUsed: 40,
    });

    expect(
      buildDriveUsageSummary({
        files,
        quota: { limitFiles: 2, usedFiles: 5 },
      }).quota,
    ).toEqual({
      limitFiles: 2,
      usedFiles: 5,
      remainingFiles: 0,
      percentUsed: 100,
    });
  });

  it('handles an empty Drive', () => {
    expect(buildDriveUsageSummary({ files: [] })).toEqual({
      totalFiles: 0,
      byCategory: [],
      bySourceApp: [],
      quota: null,
    });
  });
});
