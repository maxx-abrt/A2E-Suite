import { Temporal } from 'temporal-polyfill';

import { buildDefaultCalendarEventDraft } from '@/calendar/utils/buildDefaultCalendarEventDraft';

const TIME_ZONE = 'Europe/Paris';

describe('buildDefaultCalendarEventDraft', () => {
  it('starts a blank one-hour event on the next full hour', () => {
    const draft = buildDefaultCalendarEventDraft({ timeZone: TIME_ZONE });

    expect(draft.title).toBe('');
    expect(draft.description).toBe('');
    expect(draft.location).toBe('');
    expect(draft.isFullDay).toBe(false);
    expect(draft.isCanceled).toBe(false);
    expect(draft.startMinute).toBe(0);

    const start = draft.startDay.toPlainDateTime({
      hour: draft.startHour,
      minute: draft.startMinute,
    });
    const end = draft.endDay.toPlainDateTime({
      hour: draft.endHour,
      minute: draft.endMinute,
    });

    expect(end.since(start).total('minutes')).toBe(60);
  });

  it('never schedules the default in the past', () => {
    const draft = buildDefaultCalendarEventDraft({ timeZone: TIME_ZONE });

    const start = draft.startDay.toPlainDateTime({
      hour: draft.startHour,
      minute: draft.startMinute,
    });
    const now = Temporal.Now.plainDateTimeISO(TIME_ZONE);

    expect(Temporal.PlainDateTime.compare(start, now)).toBeGreaterThanOrEqual(
      0,
    );
  });
});
