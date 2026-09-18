import { isDefined } from 'twenty-shared/utils';

import {
  type DriveFolder,
  type DriveFolderNode,
} from '@/drive/types/DriveRecord';

// Folder tree assembly for the Drive sidebar. Input is the flat `driveFolder`
// page; parent links use the `parentId` workspace scalar. The app's
// guard-drive-folder-parent-cycle repairs corrupt ancestry server-side, but
// the browser must still be cycle-safe: a corrupt parent loop must render
// (promoted to a root) instead of hiding folders or recursing forever.

const compareDriveFolders = (left: DriveFolder, right: DriveFolder): number =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });

const sortByFolderName = <TNode extends DriveFolder>(nodes: TNode[]): TNode[] =>
  nodes.sort(compareDriveFolders);

export const buildDriveFolderTree = (
  folders: DriveFolder[],
): DriveFolderNode[] => {
  const folderIds = new Set(folders.map((folder) => folder.id));

  const childrenByParentId = new Map<string | null, DriveFolder[]>();

  for (const folder of folders) {
    const parentId =
      folder.parentId !== null &&
      folder.parentId !== folder.id &&
      folderIds.has(folder.parentId)
        ? folder.parentId
        : null;

    const siblings = childrenByParentId.get(parentId) ?? [];

    siblings.push(folder);
    childrenByParentId.set(parentId, siblings);
  }

  const visited = new Set<string>();

  const buildNodes = (parentId: string | null): DriveFolderNode[] =>
    sortByFolderName(childrenByParentId.get(parentId) ?? [])
      .filter((folder) => !visited.has(folder.id))
      .map((folder) => {
        visited.add(folder.id);

        return { ...folder, children: buildNodes(folder.id) };
      });

  const roots = buildNodes(null);

  // A cycle has no root, so its folders would be dropped. Promote the first
  // unvisited folder of each leftover component.
  if (visited.size < folders.length) {
    const leftovers = sortByFolderName(
      folders.filter((folder) => !visited.has(folder.id)),
    );

    for (const folder of leftovers) {
      if (visited.has(folder.id)) {
        continue;
      }

      visited.add(folder.id);
      roots.push({ ...folder, children: buildNodes(folder.id) });
    }
  }

  return roots;
};

export const getDriveBreadcrumb = (
  folders: DriveFolder[],
  folderId: string | null,
): DriveFolder[] => {
  if (!isDefined(folderId)) {
    return [];
  }

  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const path: DriveFolder[] = [];
  const visited = new Set<string>();
  let cursor: string | null = folderId;

  while (isDefined(cursor) && !visited.has(cursor)) {
    visited.add(cursor);

    const folder = folderById.get(cursor);

    if (!isDefined(folder)) {
      break;
    }

    path.unshift(folder);
    cursor = folder.parentId;
  }

  return path;
};

export const getDriveFolderDescendantIds = (
  folders: DriveFolder[],
  folderId: string,
): string[] => {
  const childrenByParentId = new Map<string, DriveFolder[]>();

  for (const folder of folders) {
    if (folder.parentId === null) {
      continue;
    }

    const siblings = childrenByParentId.get(folder.parentId) ?? [];

    siblings.push(folder);
    childrenByParentId.set(folder.parentId, siblings);
  }

  const descendantIds: string[] = [];
  const visited = new Set<string>([folderId]);
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;

    for (const child of childrenByParentId.get(currentId) ?? []) {
      if (visited.has(child.id)) {
        continue;
      }

      visited.add(child.id);
      descendantIds.push(child.id);
      queue.push(child.id);
    }
  }

  return descendantIds;
};

// Folders a record can be moved into: every live folder except the folder
// itself and its subtree (moving a folder under its own descendant would form
// the cycle the server guard then has to repair).
export const listDriveMoveTargets = ({
  folders,
  excludedFolderId,
}: {
  folders: DriveFolder[];
  excludedFolderId: string | null;
}): DriveFolder[] => {
  const excludedIds = new Set<string>(
    excludedFolderId === null
      ? []
      : [
          excludedFolderId,
          ...getDriveFolderDescendantIds(folders, excludedFolderId),
        ],
  );

  return folders
    .filter((folder) => !excludedIds.has(folder.id))
    .sort(compareDriveFolders);
};
