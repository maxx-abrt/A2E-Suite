import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { type CalendarEventRecord } from '@/calendar/types/CalendarEventRecord';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';
import { getCalendarEventOccurrenceDay } from '@/calendar/utils/getCalendarEventOccurrenceDay';
import { isCalendarLocalEditSurface } from '@/calendar/utils/isCalendarLocalEditSurface';
import {
  planCalendarOccurrenceDelete,
  planCalendarOccurrenceEdit,
  planCalendarSeriesDelete,
  planCalendarSeriesEdit,
} from '@/calendar/utils/planCalendarSeriesMutations';
import { serializeCalendarRecurrenceRule } from '@/calendar/utils/serializeCalendarRecurrenceRule';
import { shouldPromptCalendarSeriesScope } from '@/calendar/utils/shouldPromptCalendarSeriesScope';

const seriesId = buildCalendarSeriesId({ seriesAnchorEventId: 'anchor' });

const dailyRule: CalendarRecurrenceRule = {
  frequency: 'daily',
  interval: 1,
  byWeekdays: [],
  monthlyPosition: null,
  count: null,
  until: null,
};

const weeklyRule: CalendarRecurrenceRule = {
  ...dailyRule,
  frequency: 'weekly',
  byWeekdays: ['MO'],
};

const buildEventRecord = (
  overrides: Partial<CalendarEventRecord>,
): CalendarEventRecord => ({
  id: 'anchor',
  title: 'Standup',
  description: null,
  location: null,
  startsAt: '2026-07-15T09:00:00Z',
  endsAt: '2026-07-15T09:30:00Z',
  isFullDay: false,
  isCanceled: false,
  externalCreatedAt: null,
  recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
  recurrenceTimezone: 'UTC',
  recurrenceSeriesId: seriesId,
  recurrenceOccurrenceDay: null,
  recurrenceSkippedOccurrenceDays: '[]',
  ...overrides,
});

const anchorEvent = buildEventRecord({});

const detachedEvent = buildEventRecord({
  id: 'detached-1',
  title: 'Standup (moved)',
  startsAt: '2026-07-16T11:00:00Z',
  endsAt: '2026-07-16T12:00:00Z',
  recurrenceRule: null,
  recurrenceOccurrenceDay: '2026-07-16',
  recurrenceSkippedOccurrenceDays: null,
});

const eventInput: CalendarEventInput = {
  title: 'Standup (moved)',
  description: null,
  location: null,
  startsAt: '2026-07-16T11:00:00Z',
  endsAt: '2026-07-16T12:00:00Z',
  isFullDay: false,
  isCanceled: false,
};

describe('shouldPromptCalendarSeriesScope', () => {
  it('prompts for a recurring event on an editing surface', () => {
    expect(
      shouldPromptCalendarSeriesScope({ event: anchorEvent, viewMode: 'day' }),
    ).toBe(true);
    expect(
      shouldPromptCalendarSeriesScope({
        event: anchorEvent,
        viewMode: 'agenda',
      }),
    ).toBe(true);
  });

  it('does not prompt on the read-only week/month surfaces', () => {
    expect(
      shouldPromptCalendarSeriesScope({ event: anchorEvent, viewMode: 'week' }),
    ).toBe(false);
    expect(
      shouldPromptCalendarSeriesScope({
        event: anchorEvent,
        viewMode: 'month',
      }),
    ).toBe(false);
  });

  it('does not prompt for a plain non-recurring event', () => {
    const plainEvent = buildEventRecord({
      recurrenceRule: null,
      recurrenceSeriesId: null,
    });

    expect(
      shouldPromptCalendarSeriesScope({ event: plainEvent, viewMode: 'day' }),
    ).toBe(false);
  });

  it('prompts for a detached occurrence that carries series state', () => {
    expect(
      shouldPromptCalendarSeriesScope({
        event: detachedEvent,
        viewMode: 'day',
      }),
    ).toBe(true);
  });

  it('treats only day and agenda as local-edit surfaces', () => {
    expect(isCalendarLocalEditSurface('day')).toBe(true);
    expect(isCalendarLocalEditSurface('agenda')).toBe(true);
    expect(isCalendarLocalEditSurface('week')).toBe(false);
    expect(isCalendarLocalEditSurface('month')).toBe(false);
  });
});

describe('getCalendarEventOccurrenceDay', () => {
  it('uses the day a detached occurrence names', () => {
    expect(
      getCalendarEventOccurrenceDay({ event: detachedEvent, timeZone: 'UTC' }),
    ).toBe('2026-07-16');
  });

  it('uses the series start wall-clock day for an anchor', () => {
    expect(
      getCalendarEventOccurrenceDay({ event: anchorEvent, timeZone: 'UTC' }),
    ).toBe('2026-07-15');
  });

  it('keeps the day across a DST shift in the series time zone', () => {
    const dstAnchor = buildEventRecord({
      startsAt: '2026-03-08T13:00:00Z',
      recurrenceTimezone: 'America/New_York',
    });

    expect(
      getCalendarEventOccurrenceDay({
        event: dstAnchor,
        timeZone: 'America/New_York',
      }),
    ).toBe('2026-03-08');
  });
});

describe('planCalendarOccurrenceEdit', () => {
  it('materializes a detached replacement carrying the series identity', () => {
    const plan = planCalendarOccurrenceEdit({
      anchorEvent,
      detachedEvents: [],
      occurrenceDay: '2026-07-16',
      eventInput,
    });

    expect(plan?.detachedEventId).toBeNull();
    expect(plan?.detachedInput.recurrenceSeriesId).toBe(seriesId);
    expect(plan?.detachedInput.recurrenceOccurrenceDay).toBe('2026-07-16');
    expect(plan?.detachedInput.recurrenceRule).toBeNull();
    expect(plan?.anchorUpdate).toBeNull();
  });

  it('is idempotent on retry: an existing detached row is updated, not duplicated', () => {
    const once = planCalendarOccurrenceEdit({
      anchorEvent,
      detachedEvents: [],
      occurrenceDay: '2026-07-16',
      eventInput,
    });
    const retry = planCalendarOccurrenceEdit({
      anchorEvent,
      detachedEvents: [detachedEvent],
      occurrenceDay: '2026-07-16',
      eventInput,
    });

    expect(retry?.detachedEventId).toBe('detached-1');
    expect(retry?.detachedInput).toEqual(once?.detachedInput);
  });

  it('clears an exclusion for the edited occurrence on the anchor', () => {
    const skippedAnchor = buildEventRecord({
      recurrenceSkippedOccurrenceDays: '["2026-07-16"]',
    });

    const plan = planCalendarOccurrenceEdit({
      anchorEvent: skippedAnchor,
      detachedEvents: [],
      occurrenceDay: '2026-07-16',
      eventInput,
    });

    expect(plan?.anchorUpdate?.input.recurrenceSkippedOccurrenceDays).toBe(
      '[]',
    );
  });
});

describe('planCalendarSeriesEdit', () => {
  it('swaps the rule and keeps the series identity', () => {
    const plan = planCalendarSeriesEdit({
      anchorEvent,
      detachedEvents: [],
      rule: weeklyRule,
      seriesStart: '2026-07-20T09:00:00Z',
      eventInput: { ...eventInput, startsAt: '2026-07-20T09:00:00Z' },
    });

    expect(plan?.anchorId).toBe('anchor');
    expect(plan?.anchorInput.recurrenceRule).toBe(
      serializeCalendarRecurrenceRule(weeklyRule),
    );
    expect(plan?.anchorInput.recurrenceSeriesId).toBe(seriesId);
    expect(plan?.anchorInput.recurrenceOccurrenceDay).toBeNull();
  });

  it('preserves already-materialized exceptions and detached occurrences', () => {
    const exceptionAnchor = buildEventRecord({
      recurrenceSkippedOccurrenceDays: '["2026-07-16"]',
    });

    const plan = planCalendarSeriesEdit({
      anchorEvent: exceptionAnchor,
      detachedEvents: [detachedEvent],
      rule: weeklyRule,
      eventInput,
    });

    expect(plan?.anchorInput.recurrenceSkippedOccurrenceDays).toBe(
      '["2026-07-16"]',
    );
  });
});

describe('planCalendarOccurrenceDelete', () => {
  it('records an exclusion and drops the detached replacement', () => {
    const plan = planCalendarOccurrenceDelete({
      anchorEvent,
      detachedEvents: [detachedEvent],
      occurrenceDay: '2026-07-16',
    });

    expect(plan?.anchorUpdate?.input.recurrenceSkippedOccurrenceDays).toBe(
      '["2026-07-16"]',
    );
    expect(plan?.detachedEventId).toBe('detached-1');
  });

  it('is idempotent on retry: an already-skipped occurrence is a no-op', () => {
    const skippedAnchor = buildEventRecord({
      recurrenceSkippedOccurrenceDays: '["2026-07-16"]',
    });

    const retry = planCalendarOccurrenceDelete({
      anchorEvent: skippedAnchor,
      detachedEvents: [],
      occurrenceDay: '2026-07-16',
    });

    expect(retry?.anchorUpdate).toBeNull();
    expect(retry?.detachedEventId).toBeNull();
  });
});

describe('planCalendarSeriesDelete', () => {
  it('removes the anchor and every detached sibling row', () => {
    const plan = planCalendarSeriesDelete({
      anchorEvent,
      detachedEvents: [detachedEvent],
    });

    expect(plan?.seriesDeleteIds).toEqual(['anchor', 'detached-1']);
  });
});
