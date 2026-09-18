import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconArchive, IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { DriveBreadcrumb } from '@/drive/components/DriveBreadcrumb';
import { DriveBulkActions } from '@/drive/components/DriveBulkActions';
import { DriveChildFolders } from '@/drive/components/DriveChildFolders';
import { DriveFileGallery } from '@/drive/components/DriveFileGallery';
import { DriveFileList } from '@/drive/components/DriveFileList';
import { DriveFolderActions } from '@/drive/components/DriveFolderActions';
import { DriveFolderTree } from '@/drive/components/DriveFolderTree';
import { DriveToolbar } from '@/drive/components/DriveToolbar';
import { DriveTrashedFolders } from '@/drive/components/DriveTrashedFolders';
import {
  DEFAULT_DRIVE_FILE_FILTERS,
  DRIVE_FOLDER_ROOT_LABEL,
} from '@/drive/constants';
import { useDriveActions } from '@/drive/hooks/useDriveActions';
import { useDriveFiles } from '@/drive/hooks/useDriveFiles';
import { useDriveFolders } from '@/drive/hooks/useDriveFolders';
import {
  type DriveFile,
  type DriveFileFilters,
  type DriveFolder,
  type DriveViewMode,
} from '@/drive/types/DriveRecord';
import {
  buildDriveFolderTree,
  getDriveBreadcrumb,
  getDriveFolderDescendantIds,
  listDriveMoveTargets,
} from '@/drive/utils/driveFolderTree';
import { filterDriveFiles } from '@/drive/utils/driveFileFilter';
import { isDriveRecordInTrash } from '@/drive/utils/driveTrash';

const StyledPage = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

const StyledSidebar = styled.aside`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[2]};
  width: 240px;
`;

const StyledSidebarHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const StyledSidebarTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledTrashButton = styled.button<{ isActive: boolean }>`
  align-items: center;
  background: ${({ isActive }) =>
    isActive ? themeCssVariables.background.transparent.medium : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledMain = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
`;

const StyledHeader = styled.header`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]} 0;
`;

const StyledStatus = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledTrashTitle = styled.h2`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  margin: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]} 0;
`;

const StyledFiles = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

export const DrivePage = () => {
  const { t } = useLingui();

  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
  } = useDriveFolders();
  const { files, loading: filesLoading, error: filesError } = useDriveFiles();
  const {
    renameDriveFolder,
    renameDriveFile,
    setDriveFileStarred,
    moveDriveFilesToFolder,
    archiveDriveFiles,
    archiveDriveFolders,
    restoreDriveFiles,
    restoreDriveFolders,
    createDriveFolder,
  } = useDriveActions();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DriveViewMode>('list');
  const [filters, setFilters] = useState<DriveFileFilters>(
    DEFAULT_DRIVE_FILE_FILTERS,
  );
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const liveFolders = useMemo(
    () => folders.filter((folder) => !isDriveRecordInTrash(folder.archivedAt)),
    [folders],
  );
  const trashedFolders = useMemo(
    () => folders.filter((folder) => isDriveRecordInTrash(folder.archivedAt)),
    [folders],
  );
  const liveFiles = useMemo(
    () => files.filter((file) => !isDriveRecordInTrash(file.archivedAt)),
    [files],
  );
  const trashedFiles = useMemo(
    () => files.filter((file) => isDriveRecordInTrash(file.archivedAt)),
    [files],
  );

  const folderTree = useMemo(
    () => buildDriveFolderTree(liveFolders),
    [liveFolders],
  );
  const breadcrumb = useMemo(
    () => getDriveBreadcrumb(liveFolders, selectedFolderId),
    [liveFolders, selectedFolderId],
  );
  const selectedFolder =
    liveFolders.find((folder) => folder.id === selectedFolderId) ?? null;

  const moveTargetFolders = useMemo(
    () =>
      listDriveMoveTargets({
        folders: liveFolders,
        excludedFolderId: selectedFolderId,
      }),
    [liveFolders, selectedFolderId],
  );

  const childFolders = useMemo(
    () =>
      liveFolders
        .filter((folder) => folder.parentId === selectedFolderId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [liveFolders, selectedFolderId],
  );

  const visibleFiles = useMemo(() => {
    if (isTrashView) {
      return trashedFiles;
    }

    return filterDriveFiles({
      files: liveFiles,
      filters,
      folders: liveFolders,
      folderId: selectedFolderId,
      includeSubfolders,
    });
  }, [
    isTrashView,
    trashedFiles,
    liveFiles,
    filters,
    liveFolders,
    selectedFolderId,
    includeSubfolders,
  ]);

  const loading = foldersLoading || filesLoading;
  const hasError = isDefined(foldersError) || isDefined(filesError);

  const resetSelection = () => {
    setSelectedFileIds([]);
    setActionError(null);
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);

    try {
      await action();
    } catch {
      setActionError(t`The action could not be completed`);
    }
  };

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setIsTrashView(false);
    resetSelection();
  };

  const handleOpenTrash = () => {
    setIsTrashView(true);
    setSelectedFolderId(null);
    resetSelection();
  };

  const handleToggleSelection = (fileId: string) => {
    setSelectedFileIds((currentIds) =>
      currentIds.includes(fileId)
        ? currentIds.filter((id) => id !== fileId)
        : [...currentIds, fileId],
    );
  };

  const handleToggleStar = (file: DriveFile) => {
    void runAction(() => setDriveFileStarred(file.id, !file.starred));
  };

  const handleRenameFile = (fileId: string, name: string) => {
    void runAction(() => renameDriveFile(fileId, name));
  };

  const handleArchiveFile = (file: DriveFile) => {
    void runAction(() =>
      archiveDriveFiles([file.id], new Date().toISOString()),
    );
  };

  const handleRestoreFile = (file: DriveFile) => {
    void runAction(() => restoreDriveFiles([file.id]));
  };

  const getFolderSubtree = (folderId: string) => {
    const subtreeIds = [
      folderId,
      ...getDriveFolderDescendantIds(liveFolders, folderId),
    ];
    const subtreeIdSet = new Set(subtreeIds);
    const fileIds = liveFiles
      .filter(
        (file) => isDefined(file.folderId) && subtreeIdSet.has(file.folderId),
      )
      .map((file) => file.id);

    return { subtreeIds, fileIds };
  };

  const handleArchiveFolder = (folderId: string) => {
    const { subtreeIds, fileIds } = getFolderSubtree(folderId);
    const archivedAt = new Date().toISOString();

    void runAction(async () => {
      await archiveDriveFolders(subtreeIds, archivedAt);
      await archiveDriveFiles(fileIds, archivedAt);
    });

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
  };

  const handleRestoreFolder = (folder: DriveFolder) => {
    const subtreeIds = [
      folder.id,
      ...getDriveFolderDescendantIds(folders, folder.id),
    ];
    const subtreeIdSet = new Set(subtreeIds);
    const fileIds = files
      .filter(
        (file) =>
          isDriveRecordInTrash(file.archivedAt) &&
          isDefined(file.folderId) &&
          subtreeIdSet.has(file.folderId),
      )
      .map((file) => file.id);

    void runAction(async () => {
      await restoreDriveFolders(subtreeIds);
      await restoreDriveFiles(fileIds);
    });
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    void runAction(() => renameDriveFolder(folderId, name));
  };

  const handleCreateFolder = () => {
    const name = t`New folder`;

    void runAction(async () => {
      const createdFolder = await createDriveFolder({
        name,
        parentId: selectedFolderId,
      });

      if (isDefined(createdFolder)) {
        setSelectedFolderId(createdFolder.id);
        resetSelection();
      }
    });
  };

  const handleBulkMove = (folderId: string | null) => {
    const fileIds = selectedFileIds;

    void runAction(async () => {
      await moveDriveFilesToFolder(fileIds, folderId);
      resetSelection();
    });
  };

  const handleBulkArchive = () => {
    const fileIds = selectedFileIds;

    void runAction(async () => {
      await archiveDriveFiles(fileIds, new Date().toISOString());
      resetSelection();
    });
  };

  const handleBulkRestore = () => {
    const fileIds = selectedFileIds;

    void runAction(async () => {
      await restoreDriveFiles(fileIds);
      resetSelection();
    });
  };

  return (
    <StyledPage data-testid="drive-page">
      <StyledSidebar>
        <StyledSidebarHeader>
          <StyledSidebarTitle>{DRIVE_FOLDER_ROOT_LABEL}</StyledSidebarTitle>
        </StyledSidebarHeader>
        <StyledTrashButton
          type="button"
          isActive={isTrashView}
          aria-pressed={isTrashView}
          data-testid="drive-open-trash"
          onClick={handleOpenTrash}
        >
          <IconTrash size={16} />
          {t`Trash`}
        </StyledTrashButton>
        <DriveFolderTree
          nodes={folderTree}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
        />
      </StyledSidebar>

      <StyledMain>
        {isTrashView ? (
          <>
            <StyledTrashTitle>
              <IconArchive size={18} />
              {t`Trash`}
            </StyledTrashTitle>
            <DriveBulkActions
              selectedCount={selectedFileIds.length}
              moveTargetFolders={moveTargetFolders}
              isTrashView
              onMove={handleBulkMove}
              onArchive={handleBulkArchive}
              onRestore={handleBulkRestore}
              onClearSelection={resetSelection}
            />
            <DriveTrashedFolders
              folders={trashedFolders}
              onRestore={handleRestoreFolder}
            />
          </>
        ) : (
          <>
            <StyledHeader>
              <DriveBreadcrumb
                breadcrumb={breadcrumb}
                rootLabel={DRIVE_FOLDER_ROOT_LABEL}
                onSelectFolder={handleSelectFolder}
              />
              {isDefined(selectedFolder) && (
                <DriveFolderActions
                  folder={selectedFolder}
                  onRename={handleRenameFolder}
                  onArchive={handleArchiveFolder}
                />
              )}
            </StyledHeader>
            <DriveToolbar
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              filters={filters}
              onChangeFilters={setFilters}
              includeSubfolders={includeSubfolders}
              onToggleIncludeSubfolders={setIncludeSubfolders}
              onCreateFolder={handleCreateFolder}
            />
            <DriveBulkActions
              selectedCount={selectedFileIds.length}
              moveTargetFolders={moveTargetFolders}
              isTrashView={false}
              onMove={handleBulkMove}
              onArchive={handleBulkArchive}
              onRestore={handleBulkRestore}
              onClearSelection={resetSelection}
            />
            {filters.search === '' && (
              <DriveChildFolders
                folders={childFolders}
                onSelectFolder={handleSelectFolder}
              />
            )}
          </>
        )}

        {isDefined(actionError) && <StyledStatus>{actionError}</StyledStatus>}
        {hasError && <StyledStatus>{t`Could not load Drive`}</StyledStatus>}

        {loading && files.length === 0 ? (
          <StyledStatus>{t`Loading…`}</StyledStatus>
        ) : (
          <StyledFiles>
            {viewMode === 'list' ? (
              <DriveFileList
                files={visibleFiles}
                selectedFileIds={selectedFileIds}
                isTrashView={isTrashView}
                onToggleSelection={handleToggleSelection}
                onToggleStar={handleToggleStar}
                onRename={handleRenameFile}
                onArchive={handleArchiveFile}
                onRestore={handleRestoreFile}
              />
            ) : (
              <DriveFileGallery
                files={visibleFiles}
                selectedFileIds={selectedFileIds}
                isTrashView={isTrashView}
                onToggleSelection={handleToggleSelection}
                onToggleStar={handleToggleStar}
                onArchive={handleArchiveFile}
                onRestore={handleRestoreFile}
              />
            )}
          </StyledFiles>
        )}
      </StyledMain>
    </StyledPage>
  );
};
