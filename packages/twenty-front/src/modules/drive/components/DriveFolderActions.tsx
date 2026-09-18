import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconArchive, IconPencil } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveFolder } from '@/drive/types/DriveRecord';

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledActionButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledRenameInput = styled.input`
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: 2px ${themeCssVariables.spacing[1]};
`;

export type DriveFolderActionsProps = {
  folder: DriveFolder;
  onRename: (folderId: string, name: string) => void;
  onArchive: (folderId: string) => void;
};

export const DriveFolderActions = ({
  folder,
  onRename,
  onArchive,
}: DriveFolderActionsProps) => {
  const { t } = useLingui();
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);

  const commitRename = () => {
    const trimmedName = draftName.trim();

    setIsRenaming(false);

    if (trimmedName !== '' && trimmedName !== folder.name) {
      onRename(folder.id, trimmedName);
    }
  };

  if (isRenaming) {
    return (
      <StyledActions>
        <StyledRenameInput
          autoFocus
          value={draftName}
          aria-label={t`Folder name`}
          data-testid="drive-folder-rename-input"
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitRename();
            }
            if (event.key === 'Escape') {
              setIsRenaming(false);
              setDraftName(folder.name);
            }
          }}
          onBlur={commitRename}
        />
      </StyledActions>
    );
  }

  return (
    <StyledActions data-testid="drive-folder-actions">
      <StyledActionButton
        type="button"
        data-testid="drive-folder-rename"
        onClick={() => {
          setDraftName(folder.name);
          setIsRenaming(true);
        }}
      >
        <IconPencil size={16} />
        {t`Rename`}
      </StyledActionButton>
      <StyledActionButton
        type="button"
        data-testid="drive-folder-archive"
        onClick={() => onArchive(folder.id)}
      >
        <IconArchive size={16} />
        {t`Move to trash`}
      </StyledActionButton>
    </StyledActions>
  );
};
