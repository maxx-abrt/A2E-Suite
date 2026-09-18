import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconChevronRight, IconFolder } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveFolder } from '@/drive/types/DriveRecord';

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]} 0;
`;

const StyledSectionTitle = styled.h3`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  text-transform: uppercase;
`;

const StyledList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledFolderButton = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  max-width: 220px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledFolderName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export type DriveChildFoldersProps = {
  folders: DriveFolder[];
  onSelectFolder: (folderId: string) => void;
};

export const DriveChildFolders = ({
  folders,
  onSelectFolder,
}: DriveChildFoldersProps) => {
  const { t } = useLingui();

  if (folders.length === 0) {
    return null;
  }

  return (
    <StyledSection data-testid="drive-child-folders">
      <StyledSectionTitle>{t`Folders`}</StyledSectionTitle>
      <StyledList>
        {folders.map((folder) => (
          <li key={folder.id}>
            <StyledFolderButton
              type="button"
              data-testid={`drive-child-folder-${folder.id}`}
              onClick={() => onSelectFolder(folder.id)}
            >
              <IconFolder size={16} />
              <StyledFolderName>{folder.name}</StyledFolderName>
              <IconChevronRight size={14} />
            </StyledFolderButton>
          </li>
        ))}
      </StyledList>
    </StyledSection>
  );
};
