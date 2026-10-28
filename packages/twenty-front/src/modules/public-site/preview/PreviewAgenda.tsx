import { useState } from 'react';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { IconCalendarEvent, IconCheckbox } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { CalendarToolbar } from '@/calendar/components/CalendarToolbar';
import { type CalendarViewMode } from '@/calendar/types/CalendarViewMode';
import {
  StyledPreviewAvatar,
  StyledPreviewBadge,
  PreviewDetail,
  StyledPreviewEmpty,
  StyledPreviewHeading,
  StyledPreviewSplit,
} from './PreviewPrimitives';

const StyledCalendarScroll = styled.div`
  max-width: 100%;
  overflow-x: auto;
`;
const StyledWeek = styled.div`
  display: grid;
  grid-template-columns: 44px repeat(5, minmax(110px, 1fr));
  min-width: 620px;
  > div {
    border-right: 1px solid ${themeCssVariables.border.color.light};
    min-width: 0;
  }
  > div[data-single='true'] {
    grid-column: 2 / -1;
  }
  header {
    align-items: center;
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    color: ${themeCssVariables.font.color.secondary};
    display: flex;
    flex-direction: column;
    font-size: 10px;
    gap: 6px;
    height: 62px;
    justify-content: center;
  }
  strong {
    color: ${themeCssVariables.font.color.primary};
    font-size: 17px;
    font-weight: 500;
  }
`;
const StyledTimeAxis = styled.div`
  padding-top: 62px;
  span {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: 9px;
    height: 36px;
    padding: 0 4px;
  }
`;
const StyledDay = styled.div`
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 35px,
    ${themeCssVariables.border.color.light} 35px 36px
  );
  height: 324px;
  position: relative;
  button {
    background: ${themeCssVariables.accent.tertiary};
    border: 1px solid ${themeCssVariables.border.color.light};
    border-left: 3px solid ${themeCssVariables.color.blue};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: ${themeCssVariables.font.color.primary};
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    left: 4px;
    line-height: 1.6;
    overflow: hidden;
    padding: 6px;
    position: absolute;
    right: 4px;
    text-align: left;
  }
  button[data-tone='orange'] {
    background: ${themeCssVariables.color.orange3};
    border-left-color: ${themeCssVariables.color.orange};
  }
  button[data-tone='green'] {
    background: ${themeCssVariables.color.green3};
    border-left-color: ${themeCssVariables.color.green};
  }
  button[aria-pressed='true'] {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: 1px;
  }
  button span {
    display: block;
    font-size: 9px;
  }
  > small {
    align-items: center;
    background: ${themeCssVariables.color.green3};
    bottom: 6px;
    display: flex;
    font-size: 9px;
    gap: 4px;
    left: 4px;
    padding: 4px;
    position: absolute;
    right: 4px;
  }
`;
const StyledMonth = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(85px, 1fr));
  min-width: 640px;
  > div {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: 1px solid ${themeCssVariables.border.color.light};
    min-height: 67px;
    padding: 6px;
  }
  small {
    color: ${themeCssVariables.font.color.tertiary};
    display: block;
    font-size: 10px;
    margin-bottom: 4px;
  }
  button {
    background: ${themeCssVariables.accent.tertiary};
    border: 0;
    border-radius: ${themeCssVariables.border.radius.sm};
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 9px;
    line-height: 1.5;
    padding: 4px;
    text-align: left;
    width: 100%;
  }
`;
const StyledAgendaList = styled.div`
  padding: 16px;
  button {
    align-items: center;
    background: transparent;
    border: 1px solid ${themeCssVariables.border.color.light};
    border-left: 3px solid ${themeCssVariables.color.blue};
    border-radius: ${themeCssVariables.border.radius.sm};
    color: inherit;
    cursor: pointer;
    display: flex;
    font: inherit;
    font-size: 12px;
    gap: 12px;
    margin-bottom: 10px;
    padding: 14px;
    text-align: left;
    width: 100%;
  }
  span {
    color: ${themeCssVariables.font.color.secondary};
    font-size: 11px;
  }
`;
export const PreviewAgenda = () => {
  const { t, i18n } = useLingui();
  const [mode, setMode] = useState<CalendarViewMode>('week');
  const [offset, setOffset] = useState(0);
  const [showTaskDueDates, setShowTaskDueDates] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const locale = i18n.locale === 'pseudo-en' ? 'en' : i18n.locale;
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(
      date,
    );
  const events = [
    {
      id: 'planning',
      date: 26,
      hour: 10,
      duration: 1.5,
      name: t`Weekly planning`,
      tone: 'blue',
      description: t`Review the shared priorities and make room for focused work this week.`,
    },
    {
      id: 'review',
      date: 28,
      hour: 14,
      duration: 1,
      name: t`Project review`,
      tone: 'orange',
      description: t`Review the team handbook, gather feedback and agree on the next steps.`,
    },
    {
      id: 'catch-up',
      date: 30,
      hour: 11,
      duration: 1,
      name: t`Team catch-up`,
      tone: 'green',
      description: t`A short conversation to share progress and unblock the next piece of work.`,
    },
  ];
  const start = new Date(
    Date.UTC(
      2026,
      9 + (mode === 'month' ? offset : 0),
      mode === 'month'
        ? 1
        : (mode === 'day' ? 28 : 26) + offset * (mode === 'day' ? 1 : 7),
    ),
  );
  const days = Array.from(
    { length: mode === 'day' ? 1 : 5 },
    (_, index) => new Date(start.getTime() + index * 86400000),
  );
  const isOnDay = (event: (typeof events)[number], day: Date) =>
    day.getUTCFullYear() === 2026 &&
    day.getUTCMonth() === 9 &&
    day.getUTCDate() === event.date;
  const visibleEvents = events.filter((event) =>
    mode === 'month'
      ? start.getUTCFullYear() === 2026 && start.getUTCMonth() === 9
      : days.some((day) => isOnDay(event, day)),
  );
  const selected = events.find((event) => event.id === selectedId);
  const title =
    mode === 'month'
      ? format(start, { month: 'long', year: 'numeric' })
      : mode === 'day'
        ? format(start, { month: 'short', day: 'numeric', year: 'numeric' })
        : new Intl.DateTimeFormat(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          }).formatRange(start, days[4]);
  const monthStart = new Date(
    start.getTime() - ((start.getUTCDay() + 6) % 7) * 86400000,
  );
  return (
    <>
      <StyledPreviewHeading>
        <h3>{t`Make room for what matters.`}</h3>
        <p>{t`Plans, meetings and task deadlines, with a clear view of the week.`}</p>
      </StyledPreviewHeading>
      <CalendarToolbar
        mode={mode}
        title={title}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          setOffset(0);
          setSelectedId(null);
        }}
        onPrevious={() => {
          setOffset(offset - 1);
          setSelectedId(null);
        }}
        onNext={() => {
          setOffset(offset + 1);
          setSelectedId(null);
        }}
        onToday={() => {
          setOffset(0);
          setSelectedId(null);
        }}
        showTaskDueDates={showTaskDueDates}
        onToggleTaskDueDates={() => setShowTaskDueDates(!showTaskDueDates)}
      />
      <StyledPreviewSplit>
        <div>
          {mode === 'agenda' ? (
            <StyledAgendaList>
              {visibleEvents.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedId(event.id)}
                >
                  <IconCalendarEvent size={18} />
                  <div>
                    {event.name}
                    <br />
                    <span>
                      {format(new Date(Date.UTC(2026, 9, event.date)), {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {event.hour}:00
                    </span>
                  </div>
                </button>
              ))}
            </StyledAgendaList>
          ) : (
            <StyledCalendarScroll
              tabIndex={0}
              role="region"
              aria-label={t`Example calendar`}
            >
              {mode === 'month' ? (
                <StyledMonth>
                  {Array.from(
                    { length: 42 },
                    (_, index) =>
                      new Date(monthStart.getTime() + index * 86400000),
                  ).map((day) => (
                    <div key={day.toISOString()}>
                      <small>
                        {format(day, { weekday: 'short', day: 'numeric' })}
                      </small>
                      {events
                        .filter((event) => isOnDay(event, day))
                        .map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedId(event.id)}
                          >
                            {event.hour}:00 {event.name}
                          </button>
                        ))}
                    </div>
                  ))}
                </StyledMonth>
              ) : (
                <StyledWeek>
                  <StyledTimeAxis>
                    {Array.from({ length: 9 }, (_, index) => (
                      <span key={index}>{index + 9}:00</span>
                    ))}
                  </StyledTimeAxis>
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      data-single={mode === 'day' || undefined}
                    >
                      <header>
                        {format(day, { weekday: 'short' })}
                        <strong>{day.getUTCDate()}</strong>
                      </header>
                      <StyledDay>
                        {events
                          .filter((event) => isOnDay(event, day))
                          .map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              data-tone={event.tone}
                              aria-pressed={selectedId === event.id}
                              style={{
                                top: (event.hour - 9) * 36,
                                height: event.duration * 36,
                              }}
                              onClick={() => setSelectedId(event.id)}
                            >
                              {event.name}
                              <span>{event.hour}:00</span>
                            </button>
                          ))}
                        {showTaskDueDates &&
                          day.getUTCMonth() === 9 &&
                          day.getUTCDate() === 30 && (
                            <small>
                              <IconCheckbox size={12} />
                              {t`Plan the next review`}
                            </small>
                          )}
                      </StyledDay>
                    </div>
                  ))}
                </StyledWeek>
              )}
            </StyledCalendarScroll>
          )}
          {visibleEvents.length === 0 && (
            <StyledPreviewEmpty role="status">{t`No example events in this range.`}</StyledPreviewEmpty>
          )}
        </div>
        {selected && (
          <PreviewDetail
            title={selected.name}
            Icon={IconCalendarEvent}
            onClose={() => setSelectedId(null)}
          >
            <StyledPreviewBadge
              data-tone={selected.tone}
            >{t`Team calendar`}</StyledPreviewBadge>
            <dl>
              <dt>{t`When`}</dt>
              <dd>
                {format(new Date(Date.UTC(2026, 9, selected.date)), {
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                · {selected.hour}:00
              </dd>
              <dt>{t`Participants`}</dt>
              <dd>
                <StyledPreviewAvatar>ML</StyledPreviewAvatar>{' '}
                <StyledPreviewAvatar>JL</StyledPreviewAvatar>{' '}
                <StyledPreviewAvatar>AR</StyledPreviewAvatar>
              </dd>
            </dl>
            <p>{selected.description}</p>
          </PreviewDetail>
        )}
      </StyledPreviewSplit>
    </>
  );
};
