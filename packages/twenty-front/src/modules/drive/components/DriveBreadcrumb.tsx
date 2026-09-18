import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconChevronRight, IconFolder } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveFolder } from '@/drive/types/DriveRecord';

const StyledBreadcrumb = styled.nav`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
  min-height: 24px;
`;

const StyledCrumb = styled.button<{ isCurrent: boolean }>`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: ${({ isCurrent }) => (isCurrent ? 'default' : 'pointer')};
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ isCurrent }) =>
    isCurrent
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.regular};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledSeparator = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

export type DriveBreadcrumbProps = {
  breadcrumb: DriveFolder[];
  rootLabel: string;
  onSelectFolder: (folderId: string | null) => void;
};

export const DriveBreadcrumb = ({
  breadcrumb,
  rootLabel,
  onSelectFolder,
}: DriveBreadcrumbProps) => {
  const { t } = useLingui();

  return (
    <StyledBreadcrumb
      data-testid="drive-breadcrumb"
      aria-label={t`Folder path`}
    >
      <StyledCrumb
        type="button"
        isCurrent={breadcrumb.length === 0}
        data-testid="drive-breadcrumb-root"
        onClick={() => onSelectFolder(null)}
      >
        <IconFolder size={16} />
        {rootLabel}
      </StyledCrumb>
      {breadcrumb.map((folder, index) => {
        const isCurrent = index === breadcrumb.length - 1;

        return (
          <span key={folder.id} style={{ display: 'contents' }}>
            <StyledSeparator aria-hidden>
              <IconChevronRight size={14} />
            </StyledSeparator>
            <StyledCrumb
              type="button"
              isCurrent={isCurrent}
              aria-current={isCurrent ? 'page' : undefined}
              data-testid={`drive-breadcrumb-${folder.id}`}
              onClick={() => onSelectFolder(folder.id)}
            >
              {folder.name}
            </StyledCrumb>
          </span>
        );
      })}
    </StyledBreadcrumb>
  );
};
