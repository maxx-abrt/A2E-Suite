import {
  buildDriveFolderTree,
  getDriveBreadcrumb,
  getDriveFolderDescendantIds,
  listDriveMoveTargets,
} from '@/drive/utils/driveFolderTree';
import { type DriveFolder } from '@/drive/types/DriveRecord';

const buildFolder = (
  id: string,
  name: string,
  parentId: string | null = null,
): DriveFolder => ({
  id,
  name,
  icon: null,
  color: null,
  parentId,
  archivedAt: null,
});

describe('buildDriveFolderTree', () => {
  it('nests children under their parent and sorts siblings by name', () => {
    const tree = buildDriveFolderTree([
      buildFolder('b', 'Beta'),
      buildFolder('a', 'Alpha'),
      buildFolder('b1', 'Beta child', 'b'),
    ]);

    expect(tree.map((node) => node.name)).toEqual(['Alpha', 'Beta']);
    expect(tree[1].children.map((node) => node.name)).toEqual(['Beta child']);
    expect(tree[0].children).toEqual([]);
  });

  it('promotes a folder whose parent is missing to the root', () => {
    const tree = buildDriveFolderTree([
      buildFolder('orphan', 'Orphan', 'does-not-exist'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('orphan');
  });

  it('promotes one folder of a corrupt parent cycle instead of dropping it', () => {
    const tree = buildDriveFolderTree([
      buildFolder('a', 'Alpha', 'b'),
      buildFolder('b', 'Beta', 'a'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
  });
});

describe('getDriveBreadcrumb', () => {
  it('returns the path from the root to the folder', () => {
    const folders = [
      buildFolder('root', 'Root'),
      buildFolder('child', 'Child', 'root'),
      buildFolder('leaf', 'Leaf', 'child'),
    ];

    expect(
      getDriveBreadcrumb(folders, 'leaf').map((folder) => folder.name),
    ).toEqual(['Root', 'Child', 'Leaf']);
  });

  it('returns an empty path for the root and for unknown folders', () => {
    expect(getDriveBreadcrumb([], null)).toEqual([]);
    expect(getDriveBreadcrumb([], 'missing')).toEqual([]);
  });
});

describe('getDriveFolderDescendantIds', () => {
  it('returns every descendant and stops on a cycle', () => {
    const folders = [
      buildFolder('root', 'Root'),
      buildFolder('child', 'Child', 'root'),
      buildFolder('grandchild', 'Grandchild', 'child'),
    ];

    expect(getDriveFolderDescendantIds(folders, 'root').sort()).toEqual([
      'child',
      'grandchild',
    ]);
  });
});

describe('listDriveMoveTargets', () => {
  it('excludes the folder and its subtree', () => {
    const folders = [
      buildFolder('a', 'Alpha'),
      buildFolder('a1', 'Alpha child', 'a'),
      buildFolder('b', 'Beta'),
    ];

    expect(
      listDriveMoveTargets({ folders, excludedFolderId: 'a' }).map(
        (folder) => folder.id,
      ),
    ).toEqual(['b']);
  });

  it('returns every folder when nothing is excluded', () => {
    const folders = [buildFolder('b', 'Beta'), buildFolder('a', 'Alpha')];

    expect(
      listDriveMoveTargets({ folders, excludedFolderId: null }).map(
        (folder) => folder.id,
      ),
    ).toEqual(['a', 'b']);
  });
});
