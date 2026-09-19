import { useMemo } from 'react';

import { DriveUsageWidgetContent } from '@/drive/components/DriveUsageWidgetContent';
import { useDriveFiles } from '@/drive/hooks/useDriveFiles';
import { buildDriveUsageSummary } from '@/drive/utils/driveUsage';
import { isDriveRecordInTrash } from '@/drive/utils/driveTrash';

// Thin container over the shared `useDriveFiles` query: the aggregation is pure
// (`buildDriveUsageSummary`) so it is Tier-0 testable without Apollo. Trashed
// rows are excluded, matching the Drive page's live view.
export const DriveUsageWidget = () => {
  const { files } = useDriveFiles();

  const summary = useMemo(
    () =>
      buildDriveUsageSummary({
        files: files.filter((file) => !isDriveRecordInTrash(file.archivedAt)),
      }),
    [files],
  );

  return <DriveUsageWidgetContent summary={summary} />;
};
