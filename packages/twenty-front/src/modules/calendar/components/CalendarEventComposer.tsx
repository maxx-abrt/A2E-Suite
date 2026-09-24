import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type FormEvent } from 'react';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { CalendarRecurrenceFields } from '@/calendar/components/CalendarRecurrenceFields';
import { type CalendarEventDraft } from '@/calendar/types/CalendarEventDraft';
import { rebaseCalendarRecurrenceDraftOnStartDay } from '@/calendar/utils/rebaseCalendarRecurrenceDraftOnStartDay';

// `optional`: the event may or may not repeat (create, plain edit). `series`:
// a whole-series edit, which must keep a rule (delete the series instead).
// `hidden`: a this-occurrence edit, where the rule belongs to the anchor.
export type CalendarEventComposerRecurrenceMode =
  | 'hidden'
  | 'optional'
  | 'series';

type CalendarEventComposerProps = {
  mode: 'create' | 'edit';
  draft: CalendarEventDraft;
  recurrenceMode?: CalendarEventComposerRecurrenceMode;
  locale?: string;
  isSaving: boolean;
  errorMessage: string | null;
  onChange: (draft: CalendarEventDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
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
  max-height: 90vh;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing[4]};
  width: min(480px, 100%);
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  font-weight: ${themeCssVariables.font.weight.semiBold};
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

const StyledTextArea = styled(StyledInput)`
  min-height: 72px;
  resize: vertical;
`;

const StyledRow = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCheckboxField = styled.label`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledStatus = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  min-height: 1.2em;
`;

const StyledError = styled.p`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

const formatTimeValue = (hour: number, minute: number): string =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const parseTimeValue = (
  value: string,
  fallback: { hour: number; minute: number },
): { hour: number; minute: number } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!isDefined(match)) {
    return fallback;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }

  return { hour, minute };
};

export const CalendarEventComposer = ({
  mode,
  draft,
  recurrenceMode = 'hidden',
  locale = 'en-US',
  isSaving,
  errorMessage,
  onChange,
  onSubmit,
  onCancel,
  onDelete,
}: CalendarEventComposerProps) => {
  const { t } = useLingui();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    onSubmit();
  };

  const handleStartDateChange = (value: string) => {
    try {
      const nextStartDay = Temporal.PlainDate.from(value);

      onChange({
        ...draft,
        startDay: nextStartDay,
        recurrence: isDefined(draft.recurrence)
          ? rebaseCalendarRecurrenceDraftOnStartDay({
              recurrence: draft.recurrence,
              previousStartDay: draft.startDay,
              nextStartDay,
            })
          : draft.recurrence,
      });
    } catch {
      // Ignore an incomplete date while the user is typing.
    }
  };

  const handleEndDateChange = (value: string) => {
    try {
      onChange({ ...draft, endDay: Temporal.PlainDate.from(value) });
    } catch {
      // Ignore an incomplete date while the user is typing.
    }
  };

  return (
    <StyledBackdrop>
      <StyledForm
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? t`New event` : t`Edit event`}
        data-testid="calendar-event-composer"
        onSubmit={handleSubmit}
      >
        <StyledTitle>
          {mode === 'create' ? t`New event` : t`Edit event`}
        </StyledTitle>

        <StyledField>
          <StyledLabel>{t`Title`}</StyledLabel>
          <StyledInput
            autoFocus
            type="text"
            value={draft.title}
            placeholder={t`Event title`}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
          />
        </StyledField>

        <StyledCheckboxField>
          <input
            type="checkbox"
            checked={draft.isFullDay}
            onChange={(event) =>
              onChange({ ...draft, isFullDay: event.target.checked })
            }
          />
          {t`All day`}
        </StyledCheckboxField>

        <StyledRow>
          <StyledField>
            <StyledLabel>{t`Start`}</StyledLabel>
            <StyledInput
              type="date"
              value={draft.startDay.toString()}
              onChange={(event) => handleStartDateChange(event.target.value)}
            />
          </StyledField>
          {!draft.isFullDay && (
            <StyledField>
              <StyledLabel>{t`Start time`}</StyledLabel>
              <StyledInput
                type="time"
                value={formatTimeValue(draft.startHour, draft.startMinute)}
                onChange={(event) => {
                  const time = parseTimeValue(event.target.value, {
                    hour: draft.startHour,
                    minute: draft.startMinute,
                  });

                  onChange({
                    ...draft,
                    startHour: time.hour,
                    startMinute: time.minute,
                  });
                }}
              />
            </StyledField>
          )}
        </StyledRow>

        <StyledRow>
          <StyledField>
            <StyledLabel>{t`End`}</StyledLabel>
            <StyledInput
              type="date"
              value={draft.endDay.toString()}
              onChange={(event) => handleEndDateChange(event.target.value)}
            />
          </StyledField>
          {!draft.isFullDay && (
            <StyledField>
              <StyledLabel>{t`End time`}</StyledLabel>
              <StyledInput
                type="time"
                value={formatTimeValue(draft.endHour, draft.endMinute)}
                onChange={(event) => {
                  const time = parseTimeValue(event.target.value, {
                    hour: draft.endHour,
                    minute: draft.endMinute,
                  });

                  onChange({
                    ...draft,
                    endHour: time.hour,
                    endMinute: time.minute,
                  });
                }}
              />
            </StyledField>
          )}
        </StyledRow>

        {recurrenceMode !== 'hidden' && (
          <CalendarRecurrenceFields
            recurrence={draft.recurrence ?? null}
            startDay={draft.startDay}
            locale={locale}
            canDisableRecurrence={recurrenceMode === 'optional'}
            onChange={(recurrence) => onChange({ ...draft, recurrence })}
          />
        )}

        <StyledField>
          <StyledLabel>{t`Location`}</StyledLabel>
          <StyledInput
            type="text"
            value={draft.location}
            onChange={(event) =>
              onChange({ ...draft, location: event.target.value })
            }
          />
        </StyledField>

        <StyledField>
          <StyledLabel>{t`Description`}</StyledLabel>
          <StyledTextArea
            value={draft.description}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
          />
        </StyledField>

        {mode === 'edit' && (
          <StyledCheckboxField>
            <input
              type="checkbox"
              checked={draft.isCanceled}
              onChange={(event) =>
                onChange({ ...draft, isCanceled: event.target.checked })
              }
            />
            {t`Canceled`}
          </StyledCheckboxField>
        )}

        {isDefined(errorMessage) ? (
          <StyledError role="alert">{errorMessage}</StyledError>
        ) : (
          <StyledStatus aria-live="polite">
            {isSaving ? t`Saving…` : ''}
          </StyledStatus>
        )}

        <StyledActions>
          <Button
            type="button"
            title={t`Cancel`}
            size="small"
            variant="secondary"
            disabled={isSaving}
            onClick={onCancel}
          />
          {isDefined(onDelete) && (
            <Button
              type="button"
              title={t`Delete`}
              size="small"
              variant="secondary"
              accent="danger"
              disabled={isSaving}
              dataTestId="calendar-event-composer-delete"
              onClick={onDelete}
            />
          )}
          <Button
            type="submit"
            title={mode === 'create' ? t`Create` : t`Save`}
            size="small"
            variant="primary"
            isLoading={isSaving}
            disabled={isSaving}
            dataTestId="calendar-event-composer-save"
          />
        </StyledActions>
      </StyledForm>
    </StyledBackdrop>
  );
};
