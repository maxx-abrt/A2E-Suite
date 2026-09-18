import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconArchive, IconRestore, IconX } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveFolder } from '@/drive/types/DriveRecord';

const StyledBar = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledSelect = styled.select`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: 2px ${themeCssVariables.spacing[1]};
`;

const StyledActionButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.medium};
  }
`;

export type DriveBulkActionsProps = {
  selectedCount: number;
  moveTargetFolders: DriveFolder[];
  isTrashView: boolean;
  onMove: (folderId: string | null) => void;
  onArchive: () => void;
  onRestore: () => void;
  onClearSelection: () => void;
};

export const DriveBulkActions = ({
  selectedCount,
  moveTargetFolders,
  isTrashView,
  onMove,
  onArchive,
  onRestore,
  onClearSelection,
}: DriveBulkActionsProps) => {
  const { t } = useLingui();
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  if (selectedCount === 0) {
    return null;
  }

  return (
    <StyledBar data-testid="drive-bulk-actions">
      <StyledCount>{t`${selectedCount} selected`}</StyledCount>

      {!isTrashView && (
        <>
          <StyledSelect
            value={targetFolderId}
            aria-label={t`Move to folder`}
            data-testid="drive-bulk-move-target"
            onChange={(event) => setTargetFolderId(event.target.value)}
          >
            <option value="">{t`No folder`}</option>
            {moveTargetFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </StyledSelect>
          <StyledActionButton
            type="button"
            data-testid="drive-bulk-move"
            onClick={() =>
              onMove(targetFolderId === '' ? null : targetFolderId)
            }
          >
            {t`Move`}
          </StyledActionButton>
          <StyledActionButton
            type="button"
            data-testid="drive-bulk-archive"
            onClick={onArchive}
          >
            <IconArchive size={16} />
            {t`Move to trash`}
          </StyledActionButton>
        </>
      )}

      {isTrashView && (
        <StyledActionButton
          type="button"
          data-testid="drive-bulk-restore"
          onClick={onRestore}
        >
          <IconRestore size={16} />
          {t`Restore`}
        </StyledActionButton>
      )}

      <StyledActionButton
        type="button"
        aria-label={t`Clear selection`}
        data-testid="drive-bulk-clear"
        onClick={onClearSelection}
      >
        <IconX size={16} />
      </StyledActionButton>
    </StyledBar>
  );
};
