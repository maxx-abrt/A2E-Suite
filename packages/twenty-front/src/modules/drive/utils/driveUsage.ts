import { isDefined } from 'twenty-shared/utils';

import { type DriveFile } from '@/drive/types/DriveRecord';
import {
  getDriveFileCategory,
  resolveDriveFileSourceApp,
} from '@/drive/utils/driveFileFilter';

// Storage usage is a projection of the attachment rows Drive already reads, so
// the widget adds no query and no parallel counter. `attachment` carries no
// byte size of its own, so usage is expressed as file counts by type and by
// source app; the optional quota is only populated when billing supplies a
// limit, and stays null otherwise.

export type DriveUsageEntry = {
  key: string;
  count: number;
};

export type DriveUsageQuotaInput = {
  limitFiles: number | null;
  usedFiles?: number;
};

export type DriveUsageQuota = {
  limitFiles: number;
  usedFiles: number;
  remainingFiles: number;
  percentUsed: number;
};

export type DriveUsageSummary = {
  totalFiles: number;
  byCategory: DriveUsageEntry[];
  bySourceApp: DriveUsageEntry[];
  quota: DriveUsageQuota | null;
};

const toSortedEntries = (countsByKey: Map<string, number>): DriveUsageEntry[] =>
  [...countsByKey.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) =>
      right.count === left.count
        ? left.key.localeCompare(right.key)
        : right.count - left.count,
    );

const buildQuota = (
  quota: DriveUsageQuotaInput | undefined,
  totalFiles: number,
): DriveUsageQuota | null => {
  if (
    !isDefined(quota) ||
    !isDefined(quota.limitFiles) ||
    quota.limitFiles <= 0
  ) {
    return null;
  }

  const usedFiles = quota.usedFiles ?? totalFiles;
  const remainingFiles = Math.max(0, quota.limitFiles - usedFiles);
  const percentUsed = Math.min(
    100,
    Math.max(0, Math.round((usedFiles / quota.limitFiles) * 100)),
  );

  return {
    limitFiles: quota.limitFiles,
    usedFiles,
    remainingFiles,
    percentUsed,
  };
};

export const buildDriveUsageSummary = ({
  files,
  quota,
}: {
  files: DriveFile[];
  quota?: DriveUsageQuotaInput;
}): DriveUsageSummary => {
  const categoryCounts = new Map<string, number>();
  const sourceAppCounts = new Map<string, number>();

  for (const file of files) {
    const category = getDriveFileCategory(file);

    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    const sourceApp = resolveDriveFileSourceApp(file);

    sourceAppCounts.set(sourceApp, (sourceAppCounts.get(sourceApp) ?? 0) + 1);
  }

  return {
    totalFiles: files.length,
    byCategory: toSortedEntries(categoryCounts),
    bySourceApp: toSortedEntries(sourceAppCounts),
    quota: buildQuota(quota, files.length),
  };
};
