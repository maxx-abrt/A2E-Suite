import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

import { type DriveFile } from '@/drive/types/DriveRecord';

// Drive's files are standard `attachment` rows extended by a2e-drive
// (`folderId`, `starred`, `sourceApp`, `description`, `archivedAt`). The
// relation scalar is `folderId`; the morph targets surface as `targetXId`, used
// by the object filter and by source-app attribution.
export const useDriveFiles = () => {
  const { records, loading, error, refetch } = useFindManyRecords({
    objectNameSingular: 'attachment',
    recordGqlFields: {
      id: true,
      name: true,
      folderId: true,
      starred: true,
      sourceApp: true,
      description: true,
      archivedAt: true,
      file: true,
      targetTaskId: true,
      targetNoteId: true,
      targetPersonId: true,
      targetCompanyId: true,
      targetOpportunityId: true,
      targetDashboardId: true,
      targetWorkflowId: true,
    },
    limit: 500,
  });

  return { files: records as unknown as DriveFile[], loading, error, refetch };
};
