import { useBureauTodayProgress } from '@/bureau/hooks/useBureauTodayProgress';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { BureauSidebarAction } from '@/bureau/components/BureauSidebarAction';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconCheckbox } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-variant-numeric: tabular-nums;
`;

const StyledTrack = styled.div`
  background: ${themeCssVariables.background.quaternary};
  border-radius: 1px;
  height: 2px;
  margin: 0 ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[1]};
`;

const StyledFill = styled.div<{ percentage: number }>`
  background: ${themeCssVariables.color.orange};
  border-radius: inherit;
  height: 100%;
  width: ${({ percentage }) => percentage}%;
`;

export const BureauSidebarTasks = () => {
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const hasTaskObject = readableObjectMetadataItems.some(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === CoreObjectNameSingular.Task,
  );

  return hasTaskObject ? <BureauSidebarTasksContent /> : null;
};

const BureauSidebarTasksContent = () => {
  const { t } = useLingui();
  const { totalCount, completedCount, openCount, isLoading, hasError } =
    useBureauTodayProgress();
  const isReady =
    !isLoading &&
    !hasError &&
    isDefined(totalCount) &&
    isDefined(completedCount) &&
    isDefined(openCount);
  const completed = isReady ? Math.min(completedCount, totalCount) : 0;
  const percentage =
    isReady && totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;

  return (
    <div
      data-testid="bureau-sidebar-tasks"
      role="group"
      aria-label={t`Tasks due today`}
    >
      <BureauSidebarAction
        Icon={IconCheckbox}
        label={t`To do`}
        testId="bureau-sidebar-tasks-row"
        to={AppPath.TasksPage}
        alwaysShowHint
        hint={
          isDefined(openCount) && openCount > 0 ? (
            <StyledCount>{openCount}</StyledCount>
          ) : undefined
        }
      />
      {isReady && totalCount > 0 && (
        <StyledTrack
          role="progressbar"
          aria-label={t`Today's completed share`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <StyledFill percentage={percentage} />
        </StyledTrack>
      )}
    </div>
  );
};
