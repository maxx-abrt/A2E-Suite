import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconFolder, IconRestore } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { isPastDriveTrashRetention } from '@/drive/utils/driveTrash';
import { type DriveFolder } from '@/drive/types/DriveRecord';

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
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledExpiring = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledRestoreButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  display: flex;
  padding: ${themeCssVariables.spacing[1]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.secondary};
  }
`;

export type DriveTrashedFoldersProps = {
  folders: DriveFolder[];
  onRestore: (folder: DriveFolder) => void;
};

export const DriveTrashedFolders = ({
  folders,
  onRestore,
}: DriveTrashedFoldersProps) => {
  const { t } = useLingui();

  if (folders.length === 0) {
    return null;
  }

  return (
    <StyledList data-testid="drive-trashed-folders">
      {folders.map((folder) => {
        const isExpiring = isPastDriveTrashRetention(folder.archivedAt);

        return (
          <StyledRow
            key={folder.id}
            data-testid={`drive-trashed-folder-${folder.id}`}
          >
            <IconFolder size={16} />
            <StyledName>{folder.name}</StyledName>
            {isExpiring && <StyledExpiring>{t`Expiring soon`}</StyledExpiring>}
            <StyledRestoreButton
              type="button"
              aria-label={t`Restore ${folder.name}`}
              data-testid={`drive-trashed-folder-restore-${folder.id}`}
              onClick={() => onRestore(folder)}
            >
              <IconRestore size={16} />
            </StyledRestoreButton>
          </StyledRow>
        );
      })}
    </StyledList>
  );
};
