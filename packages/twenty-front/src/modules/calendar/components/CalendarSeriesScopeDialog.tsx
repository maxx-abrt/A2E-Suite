import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { IconCalendarEvent, IconCalendarRepeat } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type CalendarSeriesEditScope } from '@/calendar/types/CalendarSeriesEditScope';

type CalendarSeriesScopeDialogProps = {
  action: 'edit' | 'delete';
  eventTitle: string | null;
  isSaving: boolean;
  onChooseScope: (scope: CalendarSeriesEditScope) => void;
  onCancel: () => void;
};

const StyledBackdrop = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.overlayPrimary};
  display: flex;
  inset: 0;
  justify-content: center;
  padding: ${themeCssVariables.spacing[4]};
  position: fixed;
  z-index: 110;
`;

const StyledDialog = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
  width: min(440px, 100%);
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledSubtitle = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledOption = styled.button`
  align-items: flex-start;
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]};
  text-align: left;

  &:hover:not(:disabled) {
    border-color: ${themeCssVariables.color.blue};
  }

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

const StyledOptionText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StyledOptionLabel = styled.span`
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledOptionHint = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledActions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

// The explicit "this occurrence" / "whole series" choice. Deliberately has no
// "this and following" option: future-series split is not promised without an
// additional product decision, so only the two implemented scopes are offered.
export const CalendarSeriesScopeDialog = ({
  action,
  eventTitle,
  isSaving,
  onChooseScope,
  onCancel,
}: CalendarSeriesScopeDialogProps) => {
  const { t } = useLingui();

  return (
    <StyledBackdrop>
      <StyledDialog
        role="dialog"
        aria-modal="true"
        aria-label={
          action === 'edit'
            ? t`Edit recurring event`
            : t`Delete recurring event`
        }
        data-testid="calendar-series-scope-dialog"
      >
        <StyledTitle>
          {action === 'edit'
            ? t`Edit recurring event`
            : t`Delete recurring event`}
        </StyledTitle>
        <StyledSubtitle>
          {isDefined(eventTitle) && eventTitle.length > 0
            ? eventTitle
            : t`Untitled event`}
        </StyledSubtitle>
        <StyledSubtitle>
          {action === 'edit'
            ? t`This event repeats. What do you want to change?`
            : t`This event repeats. What do you want to delete?`}
        </StyledSubtitle>

        <StyledOptions>
          <StyledOption
            type="button"
            disabled={isSaving}
            data-testid="calendar-series-scope-this-occurrence"
            onClick={() => onChooseScope('this-occurrence')}
          >
            <IconCalendarEvent size={18} />
            <StyledOptionText>
              <StyledOptionLabel>{t`This occurrence`}</StyledOptionLabel>
              <StyledOptionHint>
                {action === 'edit'
                  ? t`Change only this date`
                  : t`Delete only this date`}
              </StyledOptionHint>
            </StyledOptionText>
          </StyledOption>

          <StyledOption
            type="button"
            disabled={isSaving}
            data-testid="calendar-series-scope-whole-series"
            onClick={() => onChooseScope('whole-series')}
          >
            <IconCalendarRepeat size={18} />
            <StyledOptionText>
              <StyledOptionLabel>{t`Whole series`}</StyledOptionLabel>
              <StyledOptionHint>
                {action === 'edit'
                  ? t`Change every date in the series`
                  : t`Delete every date in the series`}
              </StyledOptionHint>
            </StyledOptionText>
          </StyledOption>
        </StyledOptions>

        <StyledActions>
          <Button
            type="button"
            title={t`Cancel`}
            size="small"
            variant="secondary"
            disabled={isSaving}
            onClick={onCancel}
          />
        </StyledActions>
      </StyledDialog>
    </StyledBackdrop>
  );
};
