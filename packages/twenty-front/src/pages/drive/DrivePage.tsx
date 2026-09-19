import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { IconArchive, IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { downloadFile } from '@/activities/files/utils/downloadFile';
import { isAttachmentPreviewEnabledState } from '@/client-config/states/isAttachmentPreviewEnabledState';
import { DriveBreadcrumb } from '@/drive/components/DriveBreadcrumb';
import { DriveBulkActions } from '@/drive/components/DriveBulkActions';
import { DriveBulkResultNotice } from '@/drive/components/DriveBulkResultNotice';
import { DriveChildFolders } from '@/drive/components/DriveChildFolders';
import { DriveFileGallery } from '@/drive/components/DriveFileGallery';
import { DriveFileList } from '@/drive/components/DriveFileList';
import { DriveFolderActions } from '@/drive/components/DriveFolderActions';
import { DriveFolderTree } from '@/drive/components/DriveFolderTree';
import { DriveToolbar } from '@/drive/components/DriveToolbar';
import { DriveTrashedFolders } from '@/drive/components/DriveTrashedFolders';
import { DriveUploadDropZone } from '@/drive/components/DriveUploadDropZone';
import { DriveUploadQueuePanel } from '@/drive/components/DriveUploadQueuePanel';
import {
  DEFAULT_DRIVE_FILE_FILTERS,
  DRIVE_FOLDER_ROOT_LABEL,
  DRIVE_SOURCE_APP_DRIVE,
} from '@/drive/constants';
import { useDriveActions } from '@/drive/hooks/useDriveActions';
import { useDriveFiles } from '@/drive/hooks/useDriveFiles';
import { useDriveFolders } from '@/drive/hooks/useDriveFolders';
import { useDriveUploadQueue } from '@/drive/hooks/useDriveUploadQueue';
import { useFileUpload } from '@/file-upload/hooks/useFileUpload';
import {
  type DriveFile,
  type DriveFileFilters,
  type DriveFolder,
  type DriveViewMode,
} from '@/drive/types/DriveRecord';
import {
  canUndoDriveBulkArchive,
  getDriveFileDownloadUrl,
  runDriveBulkAction,
  toDriveBulkItem,
  type DriveBulkFailure,
  type DriveBulkResult,
  type DriveBulkUndo,
} from '@/drive/utils/driveBulkOperations';
import {
  filterDriveFiles,
  getDriveFileName,
} from '@/drive/utils/driveFileFilter';
import {
  buildDriveFolderTree,
  getDriveBreadcrumb,
  getDriveFolderDescendantIds,
  listDriveMoveTargets,
} from '@/drive/utils/driveFolderTree';
import { getDriveFilePreviewValue } from '@/drive/utils/driveFilePreview';
import {
  selectDriveFilesInRange,
  toggleDriveFileId,
} from '@/drive/utils/driveSelection';
import { isDriveRecordInTrash } from '@/drive/utils/driveTrash';
import { filePreviewState } from '@/ui/field/display/states/filePreviewState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';

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

// The outcome of the last bulk action, kept until dismissed or the member
// navigates. `undo` is only populated for a trash action that will still accept
// a restore inside the shared retention window.
type DriveBulkNotice = {
  completedCount: number;
  failures: DriveBulkFailure[];
  undo: DriveBulkUndo | null;
};

export const DrivePage = () => {
  const { t } = useLingui();

  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
  } = useDriveFolders();
  const {
    files,
    loading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useDriveFiles();
  const {
    renameDriveFolder,
    renameDriveFile,
    setDriveFileStarred,
    archiveDriveFiles,
    archiveDriveFolders,
    restoreDriveFiles,
    restoreDriveFolders,
    createDriveFolder,
    moveDriveFileToFolder,
    archiveDriveFile,
    restoreDriveFile,
  } = useDriveActions();

  const { openFileUpload } = useFileUpload();
  const {
    tasks: uploadTasks,
    enqueueFiles,
    retryTask: retryUploadTask,
    cancelTask: cancelUploadTask,
    dismissTask: dismissUploadTask,
    clearFinishedTasks: clearFinishedUploadTasks,
  } = useDriveUploadQueue({ onUploaded: refetchFiles });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DriveViewMode>('list');
  const [filters, setFilters] = useState<DriveFileFilters>(
    DEFAULT_DRIVE_FILE_FILTERS,
  );
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );
  const [bulkNotice, setBulkNotice] = useState<DriveBulkNotice | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setFilePreview = useSetAtomState(filePreviewState);
  const isAttachmentPreviewEnabled = useAtomStateValue(
    isAttachmentPreviewEnabledState,
  );

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

  const selectedFiles = useMemo(
    () => visibleFiles.filter((file) => selectedFileIds.includes(file.id)),
    [visibleFiles, selectedFileIds],
  );

  const allFilesSelected =
    visibleFiles.length > 0 && selectedFileIds.length === visibleFiles.length;
  const canUndoBulkArchive = canUndoDriveBulkArchive(bulkNotice?.undo ?? null);

  const loading = foldersLoading || filesLoading;
  const hasError = isDefined(foldersError) || isDefined(filesError);

  const resetSelection = () => {
    setSelectedFileIds([]);
    setSelectionAnchorId(null);
    setActionError(null);
  };

  // Bulk failures live in the notice, not the single-action error line, and the
  // failed rows stay selected so the member can retry exactly what failed.
  const applyBulkResult = (
    result: DriveBulkResult,
    undo: DriveBulkUndo | null,
  ) => {
    setBulkNotice({
      completedCount: result.succeededIds.length,
      failures: result.failures,
      undo,
    });
    setSelectedFileIds(result.failures.map((failure) => failure.id));
    setSelectionAnchorId(null);
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
    setBulkNotice(null);
    resetSelection();
  };

  const handleOpenTrash = () => {
    setIsTrashView(true);
    setSelectedFolderId(null);
    setBulkNotice(null);
    resetSelection();
  };

  const handleToggleSelection = (fileId: string, isRange: boolean = false) => {
    if (isRange && isDefined(selectionAnchorId)) {
      setSelectedFileIds(
        selectDriveFilesInRange({
          orderedFileIds: visibleFiles.map((file) => file.id),
          anchorId: selectionAnchorId,
          targetId: fileId,
        }),
      );
      return;
    }

    setSelectedFileIds((currentIds) => toggleDriveFileId(currentIds, fileId));
    setSelectionAnchorId(fileId);
  };

  const handleSelectAll = () => {
    setSelectedFileIds(
      allFilesSelected ? [] : visibleFiles.map((file) => file.id),
    );
    setSelectionAnchorId(null);
  };

  const handleDismissBulkNotice = () => setBulkNotice(null);

  const handleToggleStar = (file: DriveFile) => {
    void runAction(() => setDriveFileStarred(file.id, !file.starred));
  };

  const handleRenameFile = (fileId: string, name: string) => {
    void runAction(() => renameDriveFile(fileId, name));
  };

  // Preview reuses the global `filePreviewState` modal (DocumentViewer), the
  // same primitive every FILES field uses. When previews are disabled by client
  // config, clicking downloads instead, mirroring FilesDisplay.
  const handlePreviewFile = (file: DriveFile) => {
    const previewValue = getDriveFilePreviewValue(file);

    if (!isDefined(previewValue)) {
      return;
    }

    if (isAttachmentPreviewEnabled) {
      setFilePreview(previewValue);
      return;
    }

    if (isDefined(previewValue.url)) {
      downloadFile(previewValue.url, previewValue.label ?? 'file');
    }
  };

  const handleUploadFiles = (filesToUpload: File[]) => {
    void enqueueFiles(filesToUpload, {
      folderId: selectedFolderId,
      sourceApp: DRIVE_SOURCE_APP_DRIVE,
    });
  };

  const handleOpenUploadPicker = () => {
    openFileUpload({ multiple: true, onUpload: handleUploadFiles });
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

  const handleBulkDownload = () => {
    const items = selectedFiles.map(toDriveBulkItem);

    void (async () => {
      const result = await runDriveBulkAction({
        items,
        action: async ({ file }) => {
          const url = getDriveFileDownloadUrl(file);

          if (!isDefined(url)) {
            return 'download-url-missing';
          }

          await downloadFile(url, getDriveFileName(file));
        },
      });

      applyBulkResult(result, null);
    })();
  };

  const handleBulkMove = (folderId: string | null) => {
    const items = selectedFiles.map(toDriveBulkItem);

    void (async () => {
      const result = await runDriveBulkAction({
        items,
        action: ({ id }) => moveDriveFileToFolder(id, folderId),
      });

      applyBulkResult(result, null);
    })();
  };

  const handleBulkArchive = () => {
    const items = selectedFiles.map(toDriveBulkItem);
    const archivedAt = new Date().toISOString();

    void (async () => {
      const result = await runDriveBulkAction({
        items,
        action: ({ id }) => archiveDriveFile(id, archivedAt),
      });

      const undo: DriveBulkUndo | null =
        result.succeededIds.length > 0
          ? {
              items: items
                .filter((item) => result.succeededIds.includes(item.id))
                .map(({ id, label }) => ({ id, label })),
              archivedAt,
            }
          : null;

      applyBulkResult(result, undo);
    })();
  };

  const handleBulkRestore = () => {
    const items = selectedFiles.map(toDriveBulkItem);

    void (async () => {
      const result = await runDriveBulkAction({
        items,
        action: ({ id }) => restoreDriveFile(id),
      });

      applyBulkResult(result, null);
    })();
  };

  const handleUndoBulkArchive = () => {
    const undo = bulkNotice?.undo;

    if (!isDefined(undo)) {
      return;
    }

    void (async () => {
      const result = await runDriveBulkAction({
        items: undo.items,
        action: ({ id }) => restoreDriveFile(id),
      });

      applyBulkResult(result, null);
    })();
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

      <DriveUploadDropZone onUploadFiles={handleUploadFiles}>
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
                totalFileCount={visibleFiles.length}
                allSelected={allFilesSelected}
                onSelectAll={handleSelectAll}
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
                onUpload={handleOpenUploadPicker}
              />
              <DriveBulkActions
                selectedCount={selectedFileIds.length}
                moveTargetFolders={moveTargetFolders}
                isTrashView={false}
                onMove={handleBulkMove}
                onArchive={handleBulkArchive}
                onRestore={handleBulkRestore}
                onClearSelection={resetSelection}
                totalFileCount={visibleFiles.length}
                allSelected={allFilesSelected}
                onSelectAll={handleSelectAll}
                onDownload={handleBulkDownload}
              />
              {filters.search === '' && (
                <DriveChildFolders
                  folders={childFolders}
                  onSelectFolder={handleSelectFolder}
                />
              )}
            </>
          )}

          {isDefined(bulkNotice) && (
            <DriveBulkResultNotice
              completedCount={bulkNotice.completedCount}
              failures={bulkNotice.failures}
              onUndo={canUndoBulkArchive ? handleUndoBulkArchive : undefined}
              onDismiss={handleDismissBulkNotice}
            />
          )}

          {isDefined(actionError) && <StyledStatus>{actionError}</StyledStatus>}
          {hasError && <StyledStatus>{t`Could not load Drive`}</StyledStatus>}

          <DriveUploadQueuePanel
            tasks={uploadTasks}
            onRetry={retryUploadTask}
            onCancel={cancelUploadTask}
            onDismiss={dismissUploadTask}
            onClearFinished={clearFinishedUploadTasks}
          />

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
                  onPreview={handlePreviewFile}
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
                  onPreview={handlePreviewFile}
                />
              )}
            </StyledFiles>
          )}
        </StyledMain>
      </DriveUploadDropZone>
    </StyledPage>
  );
};
