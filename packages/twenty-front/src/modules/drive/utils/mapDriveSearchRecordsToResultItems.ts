import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

import { type GroupableSearchResultItem } from '@/side-panel/pages/search/utils/groupSearchResultItems';

export const DRIVE_FILE_SEARCH_GROUP_KEY = 'drive:file';

export const DRIVE_FILE_OBJECT_NAME_SINGULAR = 'attachment';

// Files are standard `attachment` rows, which the shared record-search
// primitive already indexes. A file hit deep-links to the Drive page; there is
// no per-file route because Drive is a single native page.
export const buildDriveFileSearchPath = (): string => getAppPath(AppPath.Drive);

export type DriveSearchRecord = {
  recordId: string;
  label: string;
  objectNameSingular: string;
};

// Pure mapping, unit-testable without Apollo: the hook owns the query, this
// owns the shape the Cmd+K list renders and the group it joins.
export const mapDriveSearchRecordsToResultItems = ({
  files,
}: {
  files: DriveSearchRecord[];
}): GroupableSearchResultItem[] =>
  files
    .filter((file) => isNonEmptyString(file.label))
    .map((file) => ({
      id: `drive-file-${file.recordId}`,
      label: file.label,
      objectNameSingular: DRIVE_FILE_OBJECT_NAME_SINGULAR,
      recordId: file.recordId,
      objectLabel: 'Drive',
      avatarType: 'rounded' as const,
      description: 'File',
      groupKey: DRIVE_FILE_SEARCH_GROUP_KEY,
      groupHeading: 'Drive',
      path: buildDriveFileSearchPath(),
    }));
