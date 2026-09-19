import { useMemo } from 'react';

import {
  DRIVE_FILE_OBJECT_NAME_SINGULAR,
  mapDriveSearchRecordsToResultItems,
} from '@/drive/utils/mapDriveSearchRecordsToResultItems';
import { useObjectRecordSearchRecords } from '@/object-record/hooks/useObjectRecordSearchRecords';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

export const DRIVE_SEARCH_RESULT_LIMIT = 5;

// Cmd+K Drive provider. Attachments are a standard object, so they are searched
// through the shared record-search primitive and their hits join the same P1.4
// grouping pipeline as core objects and app records. The `attachment` object is
// always installed, but the primitive's metadata guard keeps this safe if a
// workspace narrows its object set.
export const useDriveSearchResultItems = ({
  searchInput,
  skip,
}: {
  searchInput: string;
  skip: boolean;
}): {
  driveSearchResultItems: GroupableSearchResultItem[];
  loading: boolean;
} => {
  const { searchRecords: files, loading } = useObjectRecordSearchRecords({
    objectNameSingulars: [DRIVE_FILE_OBJECT_NAME_SINGULAR],
    searchInput,
    skip,
    limit: DRIVE_SEARCH_RESULT_LIMIT,
  });

  const driveSearchResultItems = useMemo<GroupableSearchResultItem[]>(
    () => mapDriveSearchRecordsToResultItems({ files }),
    [files],
  );

  return {
    driveSearchResultItems,
    loading,
  };
};
