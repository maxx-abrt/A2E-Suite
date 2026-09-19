import { AppPath } from 'twenty-shared/types';
import { getAppPath } from 'twenty-shared/utils';

import { groupSearchResultItems } from '@/side-panel/pages/search/utils/groupSearchResultItems';
import {
  buildDriveFileSearchPath,
  DRIVE_FILE_SEARCH_GROUP_KEY,
  mapDriveSearchRecordsToResultItems,
} from '@/drive/utils/mapDriveSearchRecordsToResultItems';

describe('buildDriveFileSearchPath', () => {
  it('should deep-link to the Drive page', () => {
    expect(buildDriveFileSearchPath()).toBe(getAppPath(AppPath.Drive));
  });
});

describe('mapDriveSearchRecordsToResultItems', () => {
  it('should emit a file item under the Drive group key', () => {
    const items = mapDriveSearchRecordsToResultItems({
      files: [
        {
          recordId: 'file-1',
          label: 'invoice-2026.pdf',
          objectNameSingular: 'attachment',
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0].groupKey).toBe(DRIVE_FILE_SEARCH_GROUP_KEY);
    expect(items[0].label).toBe('invoice-2026.pdf');
    expect(items[0].path).toBe(buildDriveFileSearchPath());
  });

  it('should drop records with an empty label', () => {
    const items = mapDriveSearchRecordsToResultItems({
      files: [
        { recordId: 'file-1', label: '', objectNameSingular: 'attachment' },
      ],
    });

    expect(items).toHaveLength(0);
  });

  it('should group through the shared P1.4 grouping pipeline', () => {
    const items = mapDriveSearchRecordsToResultItems({
      files: [
        {
          recordId: 'file-1',
          label: 'invoice-2026.pdf',
          objectNameSingular: 'attachment',
        },
      ],
    });

    const { groups } = groupSearchResultItems({
      items,
      frecencyRankByGroupKey: {},
    });

    expect(groups.map((group) => group.heading)).toEqual(['Drive']);
  });
});
