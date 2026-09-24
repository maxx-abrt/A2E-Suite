import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type FormEvent, type KeyboardEvent } from 'react';
import { type Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { IconCheckbox } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type CalendarTaskQuickCreateDialogProps = {
  dueDay: Temporal.PlainDate;
  title: string;
  locale?: string;
  isCreating: boolean;
  errorMessage: string | null;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
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
  z-index: 100;
`;

const StyledForm = styled.form`
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
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[2]};
  margin: 0;
`;

const StyledDue = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledField = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 1px;
  }
`;

const StyledHint = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin: 0;
`;

const StyledError = styled.p`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

// Quick-create a standard task due on a calendar day. The task is the source of
// truth: nothing is scheduled, no event row is written, no one is invited.
export const CalendarTaskQuickCreateDialog = ({
  dueDay,
  title,
  locale,
  isCreating,
  errorMessage,
  onTitleChange,
  onSubmit,
  onCancel,
}: CalendarTaskQuickCreateDialogProps) => {
  const { t } = useLingui();
  const dueDayLabel = dueDay.toLocaleString(locale, { dateStyle: 'full' });
  const canSubmit = title.trim().length > 0 && !isCreating;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape' && !isCreating) {
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <StyledBackdrop>
      <StyledForm
        role="dialog"
        aria-modal="true"
        aria-label={t`New task`}
        data-testid="calendar-task-quick-create"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      >
        <StyledTitle>
          <IconCheckbox size={18} />
          {t`New task`}
        </StyledTitle>
        <StyledDue data-testid="calendar-task-quick-create-due">
          {t`Due ${dueDayLabel}`}
        </StyledDue>

        <StyledField>
          <StyledLabel>{t`Title`}</StyledLabel>
          <StyledInput
            autoFocus
            type="text"
            value={title}
            placeholder={t`Task title`}
            data-testid="calendar-task-quick-create-title"
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </StyledField>
        <StyledHint>
          {t`Creates a task with this due date. It is not added to anyone's schedule.`}
        </StyledHint>

        {isDefined(errorMessage) && (
          <StyledError role="alert">{errorMessage}</StyledError>
        )}

        <StyledActions>
          <Button
            type="button"
            title={t`Cancel`}
            size="small"
            variant="secondary"
            disabled={isCreating}
            onClick={onCancel}
          />
          <Button
            type="submit"
            title={t`Create task`}
            size="small"
            variant="primary"
            isLoading={isCreating}
            disabled={!canSubmit}
            dataTestId="calendar-task-quick-create-submit"
          />
        </StyledActions>
      </StyledForm>
    </StyledBackdrop>
  );
};
