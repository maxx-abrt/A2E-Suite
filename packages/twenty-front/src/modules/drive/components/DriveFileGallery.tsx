import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconArchive, IconRestore, IconStar } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { DriveFileCategoryIcon } from '@/drive/components/DriveFileCategoryIcon';
import { DriveFilePreviewFallback } from '@/drive/components/DriveFilePreviewFallback';
import {
  getDriveFileCategory,
  getDriveFileName,
} from '@/drive/utils/driveFileFilter';
import { canOpenDriveFilePreview } from '@/drive/utils/driveFilePreview';
import { type DriveFile } from '@/drive/types/DriveRecord';

const StyledGrid = styled.ul`
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  list-style: none;
  margin: 0;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledCard = styled.li`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledCardHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: space-between;
`;

const StyledThumbnail = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  height: 72px;
  justify-content: center;
`;

const StyledPreviewButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  height: 100%;
  justify-content: center;
  width: 100%;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledCardName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledCardActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  justify-content: flex-end;
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

export type DriveFileGalleryProps = {
  files: DriveFile[];
  selectedFileIds: string[];
  isTrashView: boolean;
  onToggleSelection: (fileId: string, isRange: boolean) => void;
  onToggleStar: (file: DriveFile) => void;
  onArchive: (file: DriveFile) => void;
  onRestore: (file: DriveFile) => void;
  onPreview: (file: DriveFile) => void;
};

export const DriveFileGallery = ({
  files,
  selectedFileIds,
  isTrashView,
  onToggleSelection,
  onToggleStar,
  onArchive,
  onRestore,
  onPreview,
}: DriveFileGalleryProps) => {
  const { t } = useLingui();

  if (files.length === 0) {
    return (
      <StyledEmptyState data-testid="drive-file-gallery-empty">
        {t`No files here`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledGrid data-testid="drive-file-gallery">
      {files.map((file) => {
        const fileName = getDriveFileName(file);
        const isSelected = selectedFileIds.includes(file.id);

        return (
          <StyledCard key={file.id} data-testid={`drive-file-card-${file.id}`}>
            <StyledCardHeader>
              <input
                type="checkbox"
                checked={isSelected}
                aria-label={t`Select ${fileName}`}
                data-testid={`drive-file-card-select-${file.id}`}
                onChange={(event) =>
                  onToggleSelection(
                    file.id,
                    (event.nativeEvent as MouseEvent).shiftKey,
                  )
                }
              />
              {!isTrashView && (
                <StyledIconButton
                  type="button"
                  isActive={file.starred}
                  aria-label={file.starred ? t`Remove star` : t`Star`}
                  aria-pressed={file.starred}
                  data-testid={`drive-file-card-star-${file.id}`}
                  onClick={() => onToggleStar(file)}
                >
                  <IconStar size={16} />
                </StyledIconButton>
              )}
            </StyledCardHeader>
            <StyledThumbnail>
              {canOpenDriveFilePreview(file) ? (
                <StyledPreviewButton
                  type="button"
                  aria-label={t`Preview ${fileName}`}
                  data-testid={`drive-file-card-preview-${file.id}`}
                  onClick={() => onPreview(file)}
                >
                  <DriveFileCategoryIcon
                    category={getDriveFileCategory(file)}
                    size={28}
                  />
                </StyledPreviewButton>
              ) : (
                <DriveFilePreviewFallback file={file} size={28} />
              )}
            </StyledThumbnail>
            <StyledCardName>{fileName}</StyledCardName>
            <StyledCardActions>
              {!isTrashView ? (
                <StyledIconButton
                  type="button"
                  aria-label={t`Move ${fileName} to trash`}
                  data-testid={`drive-file-card-archive-${file.id}`}
                  onClick={() => onArchive(file)}
                >
                  <IconArchive size={16} />
                </StyledIconButton>
              ) : (
                <StyledIconButton
                  type="button"
                  aria-label={t`Restore ${fileName}`}
                  data-testid={`drive-file-card-restore-${file.id}`}
                  onClick={() => onRestore(file)}
                >
                  <IconRestore size={16} />
                </StyledIconButton>
              )}
            </StyledCardActions>
          </StyledCard>
        );
      })}
    </StyledGrid>
  );
};
