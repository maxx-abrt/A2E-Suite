import {
  removeDriveFileIds,
  selectDriveFilesInRange,
  toggleDriveFileId,
} from '@/drive/utils/driveSelection';

describe('toggleDriveFileId', () => {
  it('adds an unselected id and removes a selected one', () => {
    expect(toggleDriveFileId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleDriveFileId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('selectDriveFilesInRange', () => {
  const orderedFileIds = ['a', 'b', 'c', 'd'];

  it('selects forward from the anchor', () => {
    expect(
      selectDriveFilesInRange({
        orderedFileIds,
        anchorId: 'b',
        targetId: 'd',
      }),
    ).toEqual(['b', 'c', 'd']);
  });

  it('selects backward from the anchor', () => {
    expect(
      selectDriveFilesInRange({
        orderedFileIds,
        anchorId: 'd',
        targetId: 'a',
      }),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('selects a single row when the anchor is missing', () => {
    expect(
      selectDriveFilesInRange({
        orderedFileIds,
        anchorId: null,
        targetId: 'c',
      }),
    ).toEqual(['c']);
    expect(
      selectDriveFilesInRange({
        orderedFileIds,
        anchorId: 'gone',
        targetId: 'c',
      }),
    ).toEqual(['c']);
  });
});

describe('removeDriveFileIds', () => {
  it('drops only the listed ids', () => {
    expect(removeDriveFileIds(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
    expect(removeDriveFileIds(['a'], [])).toEqual(['a']);
  });
});
