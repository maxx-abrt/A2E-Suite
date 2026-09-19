import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconArchive, IconPencil, IconRestore, IconStar } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { DriveFileCategoryIcon } from '@/drive/components/DriveFileCategoryIcon';
import { DriveFilePreviewFallback } from '@/drive/components/DriveFilePreviewFallback';
import {
  getDriveFileCategory,
  getDriveFileName,
} from '@/drive/utils/driveFileFilter';
import { canOpenDriveFilePreview } from '@/drive/utils/driveFilePreview';
import { type DriveFile } from '@/drive/types/DriveRecord';

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledRow = styled.li`
  align-items: center;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledNameCell = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex: 1;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
`;

const StyledName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledPreviewButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: inherit;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  padding: 0;

  &:hover ${StyledName} {
    text-decoration: underline;
  }
`;

const StyledNameInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: 2px ${themeCssVariables.spacing[1]};
`;

const StyledIconButton = styled.button<{ isActive?: boolean }>`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isActive }) =>
    isActive
      ? themeCssVariables.color.yellow
      : themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export type DriveFileListProps = {
  files: DriveFile[];
  selectedFileIds: string[];
  isTrashView: boolean;
  onToggleSelection: (fileId: string, isRange: boolean) => void;
  onToggleStar: (file: DriveFile) => void;
  onRename: (fileId: string, name: string) => void;
  onArchive: (file: DriveFile) => void;
  onRestore: (file: DriveFile) => void;
  onPreview: (file: DriveFile) => void;
};

const DriveFileRow = ({
  file,
  isSelected,
  isTrashView,
  onToggleSelection,
  onToggleStar,
  onRename,
  onArchive,
  onRestore,
  onPreview,
}: {
  file: DriveFile;
  isSelected: boolean;
  isTrashView: boolean;
  onToggleSelection: (fileId: string, isRange: boolean) => void;
  onToggleStar: (file: DriveFile) => void;
  onRename: (fileId: string, name: string) => void;
  onArchive: (file: DriveFile) => void;
  onRestore: (file: DriveFile) => void;
  onPreview: (file: DriveFile) => void;
}) => {
  const { t } = useLingui();
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(getDriveFileName(file));

  const fileName = getDriveFileName(file);

  const commitRename = () => {
    const trimmedName = draftName.trim();

    setIsRenaming(false);

    if (trimmedName !== '' && trimmedName !== fileName) {
      onRename(file.id, trimmedName);
    }
  };

  return (
    <StyledRow data-testid={`drive-file-row-${file.id}`}>
      <input
        type="checkbox"
        checked={isSelected}
        aria-label={t`Select ${fileName}`}
        data-testid={`drive-file-select-${file.id}`}
        onChange={(event) =>
          onToggleSelection(file.id, (event.nativeEvent as MouseEvent).shiftKey)
        }
      />
      <StyledNameCell>
        {isRenaming ? (
          <>
            <DriveFileCategoryIcon category={getDriveFileCategory(file)} />
            <StyledNameInput
              autoFocus
              value={draftName}
              aria-label={t`File name`}
              data-testid={`drive-file-rename-input-${file.id}`}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitRename();
                }
                if (event.key === 'Escape') {
                  setIsRenaming(false);
                  setDraftName(fileName);
                }
              }}
              onBlur={commitRename}
            />
          </>
        ) : canOpenDriveFilePreview(file) ? (
          <StyledPreviewButton
            type="button"
            aria-label={t`Preview ${fileName}`}
            data-testid={`drive-file-preview-${file.id}`}
            onClick={() => onPreview(file)}
          >
            <DriveFileCategoryIcon category={getDriveFileCategory(file)} />
            <StyledName>{fileName}</StyledName>
          </StyledPreviewButton>
        ) : (
          <>
            <DriveFilePreviewFallback file={file} />
            <StyledName>{fileName}</StyledName>
          </>
        )}
      </StyledNameCell>

      {!isTrashView && (
        <>
          <StyledIconButton
            type="button"
            isActive={file.starred}
            aria-label={file.starred ? t`Remove star` : t`Star`}
            aria-pressed={file.starred}
            data-testid={`drive-file-star-${file.id}`}
            onClick={() => onToggleStar(file)}
          >
            <IconStar size={16} />
          </StyledIconButton>
          <StyledIconButton
            type="button"
            aria-label={t`Rename ${fileName}`}
            data-testid={`drive-file-rename-${file.id}`}
            onClick={() => {
              setDraftName(fileName);
              setIsRenaming(true);
            }}
          >
            <IconPencil size={16} />
          </StyledIconButton>
          <StyledIconButton
            type="button"
            aria-label={t`Move ${fileName} to trash`}
            data-testid={`drive-file-archive-${file.id}`}
            onClick={() => onArchive(file)}
          >
            <IconArchive size={16} />
          </StyledIconButton>
        </>
      )}

      {isTrashView && (
        <StyledIconButton
          type="button"
          aria-label={t`Restore ${fileName}`}
          data-testid={`drive-file-restore-${file.id}`}
          onClick={() => onRestore(file)}
        >
          <IconRestore size={16} />
        </StyledIconButton>
      )}
    </StyledRow>
  );
};

export const DriveFileList = ({
  files,
  selectedFileIds,
  isTrashView,
  onToggleSelection,
  onToggleStar,
  onRename,
  onArchive,
  onRestore,
  onPreview,
}: DriveFileListProps) => {
  const { t } = useLingui();

  if (files.length === 0) {
    return (
      <StyledEmptyState data-testid="drive-file-list-empty">
        {t`No files here`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledList data-testid="drive-file-list">
      {files.map((file) => (
        <DriveFileRow
          key={file.id}
          file={file}
          isSelected={selectedFileIds.includes(file.id)}
          isTrashView={isTrashView}
          onToggleSelection={onToggleSelection}
          onToggleStar={onToggleStar}
          onRename={onRename}
          onArchive={onArchive}
          onRestore={onRestore}
          onPreview={onPreview}
        />
      ))}
    </StyledList>
  );
};
