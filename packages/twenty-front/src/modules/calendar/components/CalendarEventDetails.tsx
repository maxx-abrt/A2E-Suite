import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { formatCalendarEventTime } from '@/calendar/utils/formatCalendarEventTime';
import { getCalendarEventAccentColor } from '@/calendar/utils/getCalendarEventAccentColor';
import { useOpenCalendarEventInSidePanel } from '@/side-panel/hooks/useOpenCalendarEventInSidePanel';

type CalendarEventDetailsProps = {
  event: CalendarEventRecord;
  isAllDay: boolean;
  isLocal: boolean;
  isEditable: boolean;
  timeZone: string;
  locale?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const StyledDetails = styled.aside<{ color: string }>`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-left: 4px solid ${({ color }) => color};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledTitle = styled.h3`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin: 0;
`;

const StyledField = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  margin: 0;
  white-space: pre-wrap;
`;

const StyledFieldLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin-right: ${themeCssVariables.spacing[1]};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledCloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.xs};

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: 2px;
  }
`;

export const CalendarEventDetails = ({
  event,
  isAllDay,
  isLocal,
  isEditable,
  timeZone,
  locale,
  onClose,
  onEdit,
  onDelete,
}: CalendarEventDetailsProps) => {
  const { t } = useLingui();
  const { openCalendarEventInSidePanel } = useOpenCalendarEventInSidePanel();
  const accentColor = getCalendarEventAccentColor(event.id);
  const time = isAllDay
    ? t`All day`
    : formatCalendarEventTime({ event, timeZone, locale });

  return (
    <StyledDetails color={accentColor} data-testid="calendar-event-details">
      <StyledHeader>
        <StyledTitle>
          {isDefined(event.title) ? event.title : t`Untitled event`}
        </StyledTitle>
        <StyledCloseButton
          type="button"
          aria-label={t`Close event details`}
          onClick={onClose}
        >
          {t`Close`}
        </StyledCloseButton>
      </StyledHeader>
      <StyledField>
        <StyledFieldLabel>{t`Time`}</StyledFieldLabel>
        {time}
      </StyledField>
      <StyledField>
        <StyledFieldLabel>{t`Location`}</StyledFieldLabel>
        {isDefined(event.location) ? event.location : t`No location`}
      </StyledField>
      <StyledField>
        <StyledFieldLabel>{t`Description`}</StyledFieldLabel>
        {isDefined(event.description) ? event.description : t`No description`}
      </StyledField>
      <Button
        title={t`Open event`}
        size="small"
        variant="secondary"
        onClick={() => openCalendarEventInSidePanel(event.id)}
      />
      {isLocal && isEditable ? (
        <StyledActions>
          <Button
            title={t`Edit`}
            size="small"
            variant="secondary"
            dataTestId="calendar-event-edit"
            onClick={onEdit}
          />
          <Button
            title={t`Delete`}
            size="small"
            variant="secondary"
            accent="danger"
            dataTestId="calendar-event-delete"
            onClick={onDelete}
          />
        </StyledActions>
      ) : isLocal ? (
        <StyledField data-testid="calendar-event-read-only-view">
          {t`Switch to the day or agenda view to edit this event.`}
        </StyledField>
      ) : (
        <StyledField data-testid="calendar-event-read-only">
          {t`This event is synced from a connected calendar and is read-only.`}
        </StyledField>
      )}
    </StyledDetails>
  );
};
