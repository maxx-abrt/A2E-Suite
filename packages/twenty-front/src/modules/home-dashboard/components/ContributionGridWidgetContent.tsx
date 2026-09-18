import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import {
  type ContributionGridWeek,
  countContributionGridActivities,
} from '@/home-dashboard/utils/buildContributionGrid';

const CELL_SIZE = 10;

const CONTRIBUTION_LEVEL_BACKGROUNDS = [
  themeCssVariables.background.transparent.light,
  themeCssVariables.color.blue2,
  themeCssVariables.color.blue5,
  themeCssVariables.color.blue8,
  themeCssVariables.color.blue10,
] as const;

const StyledGridContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledGrid = styled.div`
  display: grid;
  gap: 2px;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, ${CELL_SIZE}px);
  overflow-x: auto;
`;

const StyledCell = styled.span<{ level: 0 | 1 | 2 | 3 | 4 | null }>`
  background: ${({ level }) =>
    level === null ? 'transparent' : CONTRIBUTION_LEVEL_BACKGROUNDS[level]};
  border-radius: 2px;
  height: ${CELL_SIZE}px;
  width: ${CELL_SIZE}px;
`;

const StyledCaption = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

export type ContributionGridWidgetContentProps = {
  weeks: ContributionGridWeek[];
};

export const ContributionGridWidgetContent = ({
  weeks,
}: ContributionGridWidgetContentProps) => {
  const { t } = useLingui();
  const totalCount = countContributionGridActivities(weeks);

  return (
    <StyledGridContainer data-testid="home-contribution-grid">
      <StyledGrid aria-label={t`Activity over the last weeks`}>
        {weeks.flatMap((week) =>
          week.days.map((cell, dayIndex) => (
            <StyledCell
              key={cell?.date ?? `${week.days[0]?.date ?? 'week'}-${dayIndex}`}
              level={cell?.level ?? null}
              data-testid={
                cell !== null ? `contribution-cell-${cell.date}` : undefined
              }
              data-level={cell?.level ?? undefined}
              title={
                cell !== null
                  ? t`${cell.count} activities on ${cell.date}`
                  : undefined
              }
            />
          )),
        )}
      </StyledGrid>
      <StyledCaption>
        {t`${totalCount} activities in this period`}
      </StyledCaption>
    </StyledGridContainer>
  );
};
