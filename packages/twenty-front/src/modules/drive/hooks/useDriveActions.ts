import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';

import { type DriveFile, type DriveFolder } from '@/drive/types/DriveRecord';

// Every Drive mutation is a plain record write on one of two metadata objects:
// `driveFolder` (app-owned) or `attachment` (standard). Trash is the shared
// `archivedAt` marker, so archive/restore need no separate endpoint and the
// page can fan a bulk action out over the selected ids.

export type DriveFileUpdateInput = Partial<
  Pick<
    DriveFile,
    'name' | 'folderId' | 'starred' | 'archivedAt' | 'description' | 'sourceApp'
  >
>;

export type DriveFolderUpdateInput = Partial<
  Pick<DriveFolder, 'name' | 'parentId' | 'archivedAt' | 'icon' | 'color'>
>;

export const useDriveActions = () => {
  const { updateOneRecord } = useUpdateOneRecord();

  const { createOneRecord: createDriveFolderRecord } = useCreateOneRecord({
    objectNameSingular: 'driveFolder',
  });

  const updateDriveFolder = async (
    folderId: string,
    input: DriveFolderUpdateInput,
  ) => {
    await updateOneRecord({
      objectNameSingular: 'driveFolder',
      idToUpdate: folderId,
      updateOneRecordInput: input,
    });
  };

  const updateDriveFile = async (
    fileId: string,
    input: DriveFileUpdateInput,
  ) => {
    await updateOneRecord({
      objectNameSingular: 'attachment',
      idToUpdate: fileId,
      updateOneRecordInput: input,
    });
  };

  const runForEach = async <TId>(
    ids: TId[],
    action: (id: TId) => Promise<void>,
  ) => {
    for (const id of ids) {
      await action(id);
    }
  };

  const createDriveFolder = async ({
    name,
    parentId,
  }: {
    name: string;
    parentId: string | null;
  }) =>
    createDriveFolderRecord({ name, parentId }) as unknown as Promise<
      DriveFolder | undefined
    >;

  return {
    renameDriveFolder: (folderId: string, name: string) =>
      updateDriveFolder(folderId, { name }),
    renameDriveFile: (fileId: string, name: string) =>
      updateDriveFile(fileId, { name }),
    setDriveFileStarred: (fileId: string, starred: boolean) =>
      updateDriveFile(fileId, { starred }),
    moveDriveFilesToFolder: (fileIds: string[], folderId: string | null) =>
      runForEach(fileIds, (fileId) => updateDriveFile(fileId, { folderId })),
    moveDriveFolderToParent: (folderId: string, parentId: string | null) =>
      updateDriveFolder(folderId, { parentId }),
    archiveDriveFiles: (fileIds: string[], archivedAt: string) =>
      runForEach(fileIds, (fileId) => updateDriveFile(fileId, { archivedAt })),
    archiveDriveFolders: (folderIds: string[], archivedAt: string) =>
      runForEach(folderIds, (folderId) =>
        updateDriveFolder(folderId, { archivedAt }),
      ),
    restoreDriveFiles: (fileIds: string[]) =>
      runForEach(fileIds, (fileId) =>
        updateDriveFile(fileId, { archivedAt: null }),
      ),
    restoreDriveFolders: (folderIds: string[]) =>
      runForEach(folderIds, (folderId) =>
        updateDriveFolder(folderId, { archivedAt: null }),
      ),
    createDriveFolder,
  };
};
