import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';

import { type DriveFolder } from '@/drive/types/DriveRecord';

// Folders are the app-owned `driveFolder` metadata object (a2e-drive), so they
// are read through the shared object-record machinery rather than a bespoke
// query. `parentId` is the relation scalar the metadata engine derives from the
// `parent` field.
export const useDriveFolders = () => {
  const { records, loading, error, refetch } = useFindManyRecords({
    objectNameSingular: 'driveFolder',
    recordGqlFields: {
      id: true,
      name: true,
      icon: true,
      color: true,
      parentId: true,
      archivedAt: true,
    },
    limit: 500,
  });

  return {
    folders: records as unknown as DriveFolder[],
    loading,
    error,
    refetch,
  };
};
