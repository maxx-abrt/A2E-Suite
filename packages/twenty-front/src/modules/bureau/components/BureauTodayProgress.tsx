import { useBureauTodayProgress } from '@/bureau/hooks/useBureauTodayProgress';
import { useBureauTaskSheetPreferences } from '@/bureau/hooks/useBureauTaskSheetPreferences';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCard = styled.button`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${themeCssVariables.spacing[5]};
  padding: ${themeCssVariables.spacing[5]};
  text-align: left;
  transition: border-color 160ms ease;
  width: 100%;

  &:hover {
    border-color: ${themeCssVariables.color.orange};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 3px;
  }
`;

const StyledPixels = styled.div`
  display: grid;
  flex-shrink: 0;
  gap: 3px;
  grid-template-columns: repeat(5, 7px);
`;

const StyledPixel = styled.span<{ filled: boolean; position: number }>`
  animation: ${({ filled }) =>
    filled ? 'bureau-pixel-reveal 300ms ease both' : 'none'};
  animation-delay: ${({ position }) => position * 12}ms;
  background: ${({ filled }) =>
    filled
      ? themeCssVariables.color.orange
      : themeCssVariables.background.quaternary};
  border-radius: 1px;
  height: 7px;
  width: 7px;

  @keyframes bureau-pixel-reveal {
    from {
      opacity: 0.25;
      transform: scale(0.65);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const StyledContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledValue = styled.strong`
  font-size: ${themeCssVariables.font.size.xl};
  font-variant-numeric: tabular-nums;
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledCaption = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
`;

export const BureauTodayProgress = () => {
  const { readableObjectMetadataItems } = useReadableObjectMetadataItems();
  const taskObject = readableObjectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === CoreObjectNameSingular.Task,
  );

  return taskObject ? (
    <BureauTodayProgressContent
      key={taskObject.id}
      objectMetadataId={taskObject.id}
    />
  ) : null;
};

type BureauTodayProgressContentProps = {
  objectMetadataId: string;
};

const BureauTodayProgressContent = ({
  objectMetadataId,
}: BureauTodayProgressContentProps) => {
  const { t } = useLingui();
  const { totalCount, completedCount, openCount, isLoading, hasError } =
    useBureauTodayProgress();
  const [, setTaskSheetPreferences] =
    useBureauTaskSheetPreferences(objectMetadataId);
  const isReady =
    !isLoading &&
    !hasError &&
    isDefined(totalCount) &&
    isDefined(completedCount) &&
    isDefined(openCount);
  const completed = isReady ? Math.min(completedCount, totalCount) : 0;
  const percentage =
    isReady && totalCount > 0 ? Math.round((completed / totalCount) * 100) : 0;
  const filledPixels = Math.round((percentage / 100) * 25);

  // The widget stays a lens on the task sheet: applying its scope here keeps
  // the two surfaces in sync without a second task list to maintain.
  const handleFocusTodayTasks = () => {
    setTaskSheetPreferences((previous) => ({ ...previous, scope: 'today' }));
    document
      .getElementById(`bureau-task-sheet-${objectMetadataId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <StyledCard
      onClick={handleFocusTodayTasks}
      aria-label={t`Show today's tasks`}
      title={t`Opens the task sheet on Today`}
    >
      <StyledPixels aria-hidden="true">
        {Array.from({ length: 25 }, (_, position) => (
          <StyledPixel
            key={position}
            position={position}
            filled={position < filledPixels}
          />
        ))}
      </StyledPixels>
      <StyledContent>
        <StyledLabel>{t`Due today · assigned to you`}</StyledLabel>
        {isReady ? (
          <>
            <StyledValue>
              {openCount} {t`open`}
            </StyledValue>
            <StyledCaption aria-live="polite">
              {totalCount === 0
                ? t`A little room to plan your day.`
                : t`${completed} of ${totalCount} completed`}
            </StyledCaption>
          </>
        ) : (
          <StyledCaption role="status">
            {hasError
              ? t`Progress is unavailable. Open tasks to continue.`
              : t`Loading your day…`}
          </StyledCaption>
        )}
      </StyledContent>
    </StyledCard>
  );
};
