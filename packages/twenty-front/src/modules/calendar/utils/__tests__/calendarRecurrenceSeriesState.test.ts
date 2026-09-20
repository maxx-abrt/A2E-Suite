import { type CalendarEventInput } from '@/calendar/types/CalendarEventDraft';
import { type CalendarRecurrenceRule } from '@/calendar/types/CalendarRecurrenceRule';
import { type CalendarRecurrenceSeriesState } from '@/calendar/types/CalendarRecurrenceSeriesState';
import { applyCalendarEventDelete } from '@/calendar/utils/applyCalendarEventDelete';
import { applyCalendarEventEdit } from '@/calendar/utils/applyCalendarEventEdit';
import { buildCalendarOccurrenceId } from '@/calendar/utils/buildCalendarOccurrenceId';
import { buildCalendarSeriesId } from '@/calendar/utils/buildCalendarSeriesId';
import { detachCalendarOccurrence } from '@/calendar/utils/detachCalendarOccurrence';
import { skipCalendarOccurrence } from '@/calendar/utils/skipCalendarOccurrence';

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

const buildState = (): CalendarRecurrenceSeriesState => ({
  series: {
    seriesId,
    seriesStart: '2026-07-15T09:00:00Z',
    rule: dailyRule,
  },
  skippedOccurrenceIds: [],
  detachedOccurrences: [],
});

const buildEventInput = (
  overrides: Partial<CalendarEventInput>,
): CalendarEventInput => ({
  title: 'Moved meeting',
  description: null,
  location: null,
  startsAt: '2026-07-15T11:00:00Z',
  endsAt: '2026-07-15T12:00:00Z',
  isFullDay: false,
  isCanceled: false,
  ...overrides,
});

const occurrenceIdFor = (occurrenceDay: string): string =>
  buildCalendarOccurrenceId({ seriesId, occurrenceDay });

describe('skipCalendarOccurrence', () => {
  it('materializes an exclusion', () => {
    const state = skipCalendarOccurrence({
      state: buildState(),
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(state.skippedOccurrenceIds).toEqual([occurrenceIdFor('2026-07-15')]);
    expect(state.detachedOccurrences).toEqual([]);
  });

  it('is idempotent: re-deleting the same occurrence changes nothing', () => {
    const once = skipCalendarOccurrence({
      state: buildState(),
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });
    const twice = skipCalendarOccurrence({
      state: once,
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(twice).toBe(once);
  });

  it('drops a detached replacement for the deleted occurrence', () => {
    const detached = detachCalendarOccurrence({
      state: buildState(),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    });
    const skipped = skipCalendarOccurrence({
      state: detached,
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(skipped.detachedOccurrences).toEqual([]);
    expect(skipped.skippedOccurrenceIds).toEqual([
      occurrenceIdFor('2026-07-15'),
    ]);
  });

  it('keeps the exclusions in canonical order regardless of materialization order', () => {
    const forward = skipCalendarOccurrence({
      state: skipCalendarOccurrence({
        state: buildState(),
        occurrenceId: occurrenceIdFor('2026-07-15'),
      }),
      occurrenceId: occurrenceIdFor('2026-07-16'),
    });
    const backward = skipCalendarOccurrence({
      state: skipCalendarOccurrence({
        state: buildState(),
        occurrenceId: occurrenceIdFor('2026-07-16'),
      }),
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(forward).toEqual(backward);
  });
});

describe('detachCalendarOccurrence', () => {
  it('materializes an override', () => {
    const state = detachCalendarOccurrence({
      state: buildState(),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    });

    expect(state.detachedOccurrences).toEqual([
      {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    ]);
    expect(state.skippedOccurrenceIds).toEqual([]);
  });

  it('is idempotent on retry: the same detached occurrence yields one event', () => {
    const detachedOccurrence = {
      occurrenceId: occurrenceIdFor('2026-07-15'),
      occurrenceDay: '2026-07-15',
      event: buildEventInput({}),
    };
    const once = detachCalendarOccurrence({
      state: buildState(),
      detachedOccurrence,
    });
    const twice = detachCalendarOccurrence({
      state: once,
      detachedOccurrence,
    });

    expect(twice.detachedOccurrences).toHaveLength(1);
    expect(twice).toEqual(once);
  });

  it('replaces the event when editing an already-detached occurrence', () => {
    const updated = detachCalendarOccurrence({
      state: detachCalendarOccurrence({
        state: buildState(),
        detachedOccurrence: {
          occurrenceId: occurrenceIdFor('2026-07-15'),
          occurrenceDay: '2026-07-15',
          event: buildEventInput({ title: 'First edit' }),
        },
      }),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({ title: 'Second edit' }),
      },
    });

    expect(updated.detachedOccurrences).toHaveLength(1);
    expect(updated.detachedOccurrences[0].event.title).toBe('Second edit');
  });

  it('clears an exclusion when the occurrence is edited back in', () => {
    const edited = detachCalendarOccurrence({
      state: skipCalendarOccurrence({
        state: buildState(),
        occurrenceId: occurrenceIdFor('2026-07-15'),
      }),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    });

    expect(edited.skippedOccurrenceIds).toEqual([]);
    expect(edited.detachedOccurrences).toHaveLength(1);
  });

  it('keeps detached occurrences in canonical order', () => {
    const forward = detachCalendarOccurrence({
      state: detachCalendarOccurrence({
        state: buildState(),
        detachedOccurrence: {
          occurrenceId: occurrenceIdFor('2026-07-15'),
          occurrenceDay: '2026-07-15',
          event: buildEventInput({}),
        },
      }),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-16'),
        occurrenceDay: '2026-07-16',
        event: buildEventInput({}),
      },
    });
    const backward = detachCalendarOccurrence({
      state: detachCalendarOccurrence({
        state: buildState(),
        detachedOccurrence: {
          occurrenceId: occurrenceIdFor('2026-07-16'),
          occurrenceDay: '2026-07-16',
          event: buildEventInput({}),
        },
      }),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    });

    expect(forward).toEqual(backward);
  });
});

describe('applyCalendarEventEdit', () => {
  it('materializes a detached replacement for this-occurrence', () => {
    const state = applyCalendarEventEdit({
      state: buildState(),
      scope: 'this-occurrence',
      occurrenceId: occurrenceIdFor('2026-07-15'),
      occurrenceDay: '2026-07-15',
      event: buildEventInput({ title: 'Standup (moved)' }),
    });

    expect(state.detachedOccurrences).toHaveLength(1);
    expect(state.detachedOccurrences[0].event.title).toBe('Standup (moved)');
  });

  it('replaces the rule for whole-series and keeps the series identity', () => {
    const state = applyCalendarEventEdit({
      state: buildState(),
      scope: 'whole-series',
      rule: weeklyRule,
      seriesStart: '2026-07-20T09:00:00Z',
    });

    expect(state.series.seriesId).toBe(seriesId);
    expect(state.series.seriesStart).toBe('2026-07-20T09:00:00Z');
    expect(state.series.rule).toEqual(weeklyRule);
  });

  it('keeps the existing DTSTART when a whole-series edit omits it', () => {
    const state = applyCalendarEventEdit({
      state: buildState(),
      scope: 'whole-series',
      rule: weeklyRule,
    });

    expect(state.series.seriesStart).toBe('2026-07-15T09:00:00Z');
  });

  it('preserves already-materialized exceptions on a whole-series edit', () => {
    const withException = detachCalendarOccurrence({
      state: skipCalendarOccurrence({
        state: buildState(),
        occurrenceId: occurrenceIdFor('2026-07-16'),
      }),
      detachedOccurrence: {
        occurrenceId: occurrenceIdFor('2026-07-15'),
        occurrenceDay: '2026-07-15',
        event: buildEventInput({}),
      },
    });

    const state = applyCalendarEventEdit({
      state: withException,
      scope: 'whole-series',
      rule: weeklyRule,
    });

    expect(state.skippedOccurrenceIds).toEqual([occurrenceIdFor('2026-07-16')]);
    expect(state.detachedOccurrences).toHaveLength(1);
  });
});

describe('applyCalendarEventDelete', () => {
  it('materializes an exclusion for this-occurrence', () => {
    const state = applyCalendarEventDelete({
      state: buildState(),
      scope: 'this-occurrence',
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(state?.skippedOccurrenceIds).toEqual([
      occurrenceIdFor('2026-07-15'),
    ]);
  });

  it('is idempotent on a retried this-occurrence delete', () => {
    const once = applyCalendarEventDelete({
      state: buildState(),
      scope: 'this-occurrence',
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });
    const twice = applyCalendarEventDelete({
      state: once as CalendarRecurrenceSeriesState,
      scope: 'this-occurrence',
      occurrenceId: occurrenceIdFor('2026-07-15'),
    });

    expect(twice).toBe(once);
  });

  it('removes the whole series', () => {
    expect(
      applyCalendarEventDelete({
        state: buildState(),
        scope: 'whole-series',
      }),
    ).toBeNull();
  });
});
