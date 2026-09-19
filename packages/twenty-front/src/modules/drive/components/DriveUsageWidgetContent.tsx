import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type DriveUsageSummary } from '@/drive/utils/driveUsage';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledTotal = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledQuota = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSectionTitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  text-transform: uppercase;
`;

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const StyledRow = styled.li`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-variant-numeric: tabular-nums;
`;

const StyledEmpty = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

export type DriveUsageWidgetContentProps = {
  summary: DriveUsageSummary;
};

export const DriveUsageWidgetContent = ({
  summary,
}: DriveUsageWidgetContentProps) => {
  const { t } = useLingui();

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'TEXT_DOCUMENT':
        return t`Documents`;
      case 'SPREADSHEET':
        return t`Spreadsheets`;
      case 'PRESENTATION':
        return t`Presentations`;
      case 'IMAGE':
        return t`Images`;
      case 'VIDEO':
        return t`Videos`;
      case 'AUDIO':
        return t`Audio`;
      case 'ARCHIVE':
        return t`Archives`;
      default:
        return t`Other`;
    }
  };

  return (
    <StyledContainer data-testid="drive-usage-widget">
      <StyledTotal>
        {t`Total files`}: {summary.totalFiles}
      </StyledTotal>

      {isDefined(summary.quota) && (
        <StyledQuota data-testid="drive-usage-quota">
          {summary.quota.usedFiles} / {summary.quota.limitFiles} ·{' '}
          {summary.quota.percentUsed}%
        </StyledQuota>
      )}

      {summary.totalFiles === 0 ? (
        <StyledEmpty>{t`No files yet`}</StyledEmpty>
      ) : (
        <>
          <StyledSectionTitle>{t`By type`}</StyledSectionTitle>
          <StyledList data-testid="drive-usage-by-category">
            {summary.byCategory.map((entry) => (
              <StyledRow key={entry.key}>
                <span>{getCategoryLabel(entry.key)}</span>
                <StyledCount>{entry.count}</StyledCount>
              </StyledRow>
            ))}
          </StyledList>

          <StyledSectionTitle>{t`By source`}</StyledSectionTitle>
          <StyledList data-testid="drive-usage-by-source">
            {summary.bySourceApp.map((entry) => (
              <StyledRow key={entry.key}>
                <span>{entry.key}</span>
                <StyledCount>{entry.count}</StyledCount>
              </StyledRow>
            ))}
          </StyledList>
        </>
      )}
    </StyledContainer>
  );
};
